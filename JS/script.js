const $ = id => document.getElementById(id);
    const msg = txt => { $('message').textContent = txt; setTimeout(()=>{ if($('message').textContent === txt) $('message').textContent = '' }, 4200)};

    function normalizeInput(v){ return (v||'').replace(/\D/g,''); }
    function computeEAN13Checksum(d12){ const digits = d12.split('').map(d=>parseInt(d,10)); let sum=0; for(let i=0;i<12;i++) sum += (i%2===0?digits[i]:digits[i]*3); return (10 - (sum % 10)) % 10; }

    function renderBarcode(value){
      const preview = $('preview');
      preview.innerHTML = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      preview.appendChild(svg);

      const scale = Math.max(1, parseInt($('scale').value || 2,10));
      const height = Math.max(20, parseInt($('height').value || 80,10));
      const margin = parseInt($('margin').value || 10,10);
      const fontSize = Math.max(8, parseInt($('fontsize').value || 14,10));
      const bg = $('transparent').checked ? 'transparent' : '#ffffff';

      try{
        JsBarcode(svg, value, {
          format: 'ean13', width: scale, height: height, margin: margin, displayValue: true, fontSize: fontSize, background: bg, textMargin: 2
        });
      } catch(e){ msg('Erro ao gerar código.'); console.error(e); }

      $('eanValue').textContent = value;
      return svg;
    }

    async function svgToPngBlob(svgEl){
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgEl);
      if(!/^<\?xml/.test(source)) source = '<?xml version="1.0" standalone="no"?>\n' + source;
      const svgBlob = new Blob([source], {type: 'image/svg+xml;charset=utf-8'});
      const url = URL.createObjectURL(svgBlob);
      const img = new Image(); img.crossOrigin = 'anonymous';

      return new Promise((resolve,reject)=>{
        img.onload = () => {
          try{
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 600;
            canvas.height = img.naturalHeight || 200;
            const ctx = canvas.getContext('2d');
            if(!$('transparent').checked){ ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height); }
            ctx.drawImage(img,0,0);
            canvas.toBlob(blob => { URL.revokeObjectURL(url); if(blob) resolve(blob); else reject(new Error('Falha ao gerar PNG')); }, 'image/png');
          }catch(err){ URL.revokeObjectURL(url); reject(err); }
        };
        img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
        img.src = url;
      });
    }

    async function copyPngToClipboard(svgEl){
      try{
        const blob = await svgToPngBlob(svgEl);
        if(navigator.clipboard && window.ClipboardItem){
          await navigator.clipboard.write([ new ClipboardItem({'image/png': blob}) ]);
          return {ok:true, method:'clipboard'};
        }
        return {ok:false, reason:'clipboard-api'};
      }catch(e){
        console.warn('copyPngToClipboard failed', e);
        return {ok:false, reason:e};
      }
    }

    async function openPngInNewTab(svgEl){
      try{
        const blob = await svgToPngBlob(svgEl);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(()=> URL.revokeObjectURL(url), 5000);
        return true;
      }catch(e){ console.error(e); return false; }
    }

    $('gen').addEventListener('click', ()=>{
      const raw = normalizeInput($('code').value);
      if(raw.length === 0){ msg('Insira 12 ou 13 dígitos.'); return; }
      if(raw.length !== 12 && raw.length !== 13){ msg('Insira somente 12 ou 13 dígitos.'); return; }
      let final = raw;
      if(raw.length === 12) final = raw + computeEAN13Checksum(raw).toString();
      renderBarcode(final);
    });

    $('example').addEventListener('click', ()=>{ $('code').value = '123456789012'; $('gen').click(); });

    $('download').addEventListener('click', async ()=>{
      const svg = $('preview').querySelector('svg'); if(!svg){ msg('Nenhum código gerado.'); return; }
      const format = $('format').value; const name = ($('eanValue').textContent || 'ean') + (format === 'svg' ? '.svg' : '.png');
      if(format === 'svg'){
        const serializer = new XMLSerializer(); let source = serializer.serializeToString(svg); if(!/^<\?xml/.test(source)) source = '<?xml version="1.0" standalone="no"?>\n' + source;
        const blob = new Blob([source], {type: 'image/svg+xml;charset=utf-8'});
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); msg('SVG pronto para download.'); return;
      }
      try{ const blob = await svgToPngBlob(svg); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); msg('PNG pronto para download.'); }catch(e){ console.error(e); msg('Falha ao exportar PNG.'); }
    });

    $('copyForWord').addEventListener('click', async ()=>{
      const svg = $('preview').querySelector('svg'); if(!svg){ msg('Nenhum código gerado.'); return; }
      msg('Tentando copiar imagem para a área de transferência...');
      const res = await copyPngToClipboard(svg);
      if(res.ok){ msg('Imagem copiada — cole no Word com Ctrl+V.'); return; }
      const opened = await openPngInNewTab(svg);
      if(opened) msg('Não foi possível acessar a área de transferência. A imagem foi aberta em nova aba — use "botão direito → Copiar imagem" e cole no Word.');
      else msg('Não foi possível copiar nem abrir a imagem. Use o botão Baixar para salvar e inserir no Word.');
    });

    $('openTab').addEventListener('click', async ()=>{
      const svg = $('preview').querySelector('svg'); if(!svg){ msg('Nenhum código gerado.'); return; }
      const ok = await openPngInNewTab(svg); if(ok) msg('Imagem aberta em nova aba.'); else msg('Falha ao abrir a imagem.');
    });

    $('code').addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter') $('gen').click(); });


    $('example').click();