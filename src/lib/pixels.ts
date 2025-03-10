// Função para inicializar o Facebook Pixel
export function initFacebookPixel(pixelId: string) {
  // Verificar se o pixel já foi inicializado
  if (window.fbq?.loaded) {
    console.debug(`Facebook Pixel ${pixelId} já está inicializado`);
    return;
  }

  // Adicionar o script do Facebook Pixel
  const script = document.createElement('script');
  script.innerHTML = `
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
  `;
  document.head.appendChild(script);

  // Adicionar o noscript para fallback (quando JavaScript está desabilitado)
  const existingNoscript = document.querySelector(`noscript[data-pixel-id="${pixelId}"]`);
  if (!existingNoscript) {
    const noscript = document.createElement('noscript');
    noscript.setAttribute('data-pixel-id', pixelId);
    const img = document.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    document.head.appendChild(noscript);
  }

  // Aguardar a inicialização do fbq
  const waitForFbq = setInterval(() => {
    if (window.fbq) {
      clearInterval(waitForFbq);
      window.fbq('init', pixelId);
      console.debug(`Facebook Pixel ${pixelId} inicializado com sucesso`);
    }
  }, 100);

  // Limpar o intervalo após 5 segundos para evitar loop infinito
  setTimeout(() => {
    clearInterval(waitForFbq);
    if (!window.fbq) {
      console.error(`Falha ao inicializar Facebook Pixel ${pixelId}`);
    }
  }, 5000);
}

// Função para inicializar o Google Analytics
export function initGooglePixel(pixelId: string) {
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${pixelId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', pixelId);
}

// Função para inicializar o TikTok Pixel
export function initTikTokPixel(pixelId: string) {
  const script = document.createElement('script');
  script.innerHTML = `
    !function (w, d, t) {
      w.TiktokAnalyticsObject=t;
      var ttq=w[t]=w[t]||[];
      ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
      ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
      for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
      ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
      ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
      var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i;
      var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
      ttq.load('${pixelId}');
    }(window, document, 'ttq');
  `;
  document.head.appendChild(script);
} 