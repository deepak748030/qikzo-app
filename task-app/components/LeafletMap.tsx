import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/lib/theme';

export type LatLng = { lat: number; lng: number };

type Props = {
    center: LatLng;
    pickup?: LatLng | null;
    drop?: LatLng | null;
    // when true, a fixed centered pin appears and `onCenterChange` fires while panning
    pickerMode?: boolean;
    pinColor?: string;
    onCenterChange?: (c: LatLng) => void;
    onReady?: () => void;
    style?: any;
};

// Free, no-API-key map using Leaflet + OpenStreetMap tiles rendered inside a WebView.
// Works on iOS, Android, and web. Keeps the rest of the Expo app intact.
function buildHtml({
    center,
    pickup,
    drop,
    pickerMode,
    pinColor,
}: Required<Pick<Props, 'center'>> & Partial<Props>) {
    const accent = pinColor || colors.accent;
    return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#f3f3f3;}
  .leaflet-control-attribution{font-size:9px;opacity:.6;}
  .leaflet-bar{border-radius:0 !important;box-shadow:0 1px 3px rgba(0,0,0,.15);}
  .leaflet-bar a{border-radius:0 !important;}
  .pin-center{
    position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);
    z-index:500;pointer-events:none;
  }
  .pin-center svg{filter:drop-shadow(0 4px 6px rgba(0,0,0,.25));}
  .pulse{
    position:absolute;left:50%;top:50%;width:14px;height:14px;border-radius:50%;
    background:${accent};opacity:.35;transform:translate(-50%,-50%);
    animation:pulse 1.6s ease-out infinite;z-index:499;pointer-events:none;
  }
  @keyframes pulse{0%{transform:translate(-50%,-50%) scale(.6);opacity:.5}100%{transform:translate(-50%,-50%) scale(2.4);opacity:0}}
  .me-dot{width:14px;height:14px;border-radius:50%;background:#2563EB;border:2px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.3);}
</style>
</head>
<body>
<div id="map"></div>
${pickerMode ? `<div class="pulse"></div><div class="pin-center"><svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z" fill="${accent}"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg></div>` : ''}
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var post = function(p){ try{ window.ReactNativeWebView.postMessage(JSON.stringify(p)); }catch(e){} };
  var map = L.map('map', { zoomControl: false, attributionControl: true })
    .setView([${center.lat}, ${center.lng}], 15);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  function pinIcon(color){
    return L.divIcon({
      className:'',
      html:'<svg width="26" height="34" viewBox="0 0 30 38"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z" fill="'+color+'"/><circle cx="15" cy="15" r="5" fill="#fff"/></svg>',
      iconSize:[26,34], iconAnchor:[13,34]
    });
  }
  ${pickup ? `L.marker([${pickup.lat},${pickup.lng}], { icon: pinIcon('${colors.accent}') }).addTo(map);` : ''}
  ${drop ? `L.marker([${drop.lat},${drop.lng}], { icon: pinIcon('${colors.foreground}') }).addTo(map);` : ''}
  ${pickup && drop ? `
    var line = L.polyline([[${pickup.lat},${pickup.lng}],[${drop.lat},${drop.lng}]], { color:'${colors.foreground}', weight:3, dashArray:'6,6' }).addTo(map);
    map.fitBounds(line.getBounds(), { padding:[40,40] });
  ` : ''}

  ${pickerMode ? `
    var timer=null;
    map.on('move', function(){
      if(timer) clearTimeout(timer);
      timer=setTimeout(function(){
        var c=map.getCenter();
        post({type:'center', lat:c.lat, lng:c.lng});
      },120);
    });
  ` : ''}

  post({type:'ready'});

  document.addEventListener('message', handle);
  window.addEventListener('message', handle);
  function handle(ev){
    try{
      var d = JSON.parse(ev.data);
      if(d.type==='setCenter'){ map.setView([d.lat, d.lng], d.zoom || 16); }
    }catch(e){}
  }
</script>
</body></html>`;
}

export default function LeafletMap({
    center, pickup, drop, pickerMode, pinColor, onCenterChange, onReady, style,
}: Props) {
    const ref = useRef<WebView>(null);
    const html = useMemo(
        () => buildHtml({ center, pickup, drop, pickerMode, pinColor }),
        // Only rebuild when these change meaningfully
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [pickerMode, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]
    );

    const onMessage = (e: WebViewMessageEvent) => {
        try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d.type === 'center' && onCenterChange) onCenterChange({ lat: d.lat, lng: d.lng });
            if (d.type === 'ready' && onReady) onReady();
        } catch { }
    };

    // Imperatively re-center when `center` changes without rebuilding the HTML
    React.useEffect(() => {
        if (!ref.current) return;
        const js = `(function(){try{window.postMessage(JSON.stringify({type:'setCenter',lat:${center.lat},lng:${center.lng},zoom:16}));}catch(e){}})();true;`;
        ref.current.injectJavaScript(js);
    }, [center.lat, center.lng]);

    return (
        <View style={[styles.wrap, style]}>
            <WebView
                ref={ref}
                originWhitelist={['*']}
                source={{ html }}
                onMessage={onMessage}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                style={styles.web}
                androidLayerType="hardware"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: '#f3f3f3', overflow: 'hidden' },
    web: { flex: 1, backgroundColor: 'transparent' },
});
