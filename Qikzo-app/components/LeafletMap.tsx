import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { colors } from '@/lib/theme';

export type LatLng = { lat: number; lng: number };
export type RouteInfo = { distanceKm: number; durationMin: number };
export type LiveRider = { id: string; lat: number; lng: number; vehicle?: string };

type Props = {
  center: LatLng;
  pickup?: LatLng | null;
  drop?: LatLng | null;
  // when true, a fixed centered pin appears and `onCenterChange` fires while panning
  pickerMode?: boolean;
  pinColor?: string;
  // Show simulated bikes/cabs/taxis moving on nearby roads. Ignored when
  // `liveRiders` is provided — real markers take over.
  showTraffic?: boolean;
  // Real online riders from the server, updated live via socket. When set,
  // the fake simulated fleet is disabled and these markers move instead.
  liveRiders?: LiveRider[];
  onCenterChange?: (c: LatLng) => void;
  onReady?: () => void;
  // Fires once the pickup->drop route has been resolved along real roads.
  onRoute?: (r: RouteInfo) => void;
  style?: any;
};

// Map a rider's vehicle field to an emoji. Only three categories exist
// in the catalog today: bike, taxi (auto-style), and sedan (cab).
function vehicleEmoji(vehicle?: string): string {
  const v = (vehicle || '').toLowerCase();
  if (v.includes('bike') || v.includes('two') || v.includes('scoot') || v.includes('moped')) return '🏍️';
  if (v.includes('taxi') || v.includes('auto') || v.includes('rick')) return '🚕';
  return '🚗'; // sedan / cab default
}

// Free, no-API-key map using Leaflet + OpenStreetMap tiles rendered inside a WebView.
// Routing uses the public OSRM demo server (router.project-osrm.org) — no key required.
function buildHtml({
  center,
  pickup,
  drop,
  pickerMode,
  pinColor,
  showTraffic,
  hasLiveRiders,
}: Required<Pick<Props, 'center'>> & Partial<Props> & { hasLiveRiders?: boolean }) {
  const accent = pinColor || colors.accent;
  // Fake traffic is only used when caller opted in AND there are no real riders yet.
  const traffic = showTraffic !== false && !hasLiveRiders;
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
  .veh{
    display:flex;align-items:center;justify-content:center;
    width:26px;height:26px;
    font-size:22px;line-height:1;
    filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));
    transition:transform .9s linear;
  }
  .dist-label{
    background:#111;color:#fff;font-family:system-ui,-apple-system,sans-serif;
    font-size:11px;font-weight:700;padding:3px 7px;white-space:nowrap;
    box-shadow:0 2px 4px rgba(0,0,0,.25);
  }
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
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 20, subdomains: 'abcd',
    attribution: '© OpenStreetMap © CARTO'
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

  // ------------- Real road routing between pickup & drop -------------
  var routeLineBg=null, routeLine=null, distLabel=null;
  function addDistLabel(latlng, km){
    if(distLabel){ map.removeLayer(distLabel); }
    distLabel = L.marker(latlng, {
      interactive:false,
      icon: L.divIcon({
        className:'',
        html:'<div class="dist-label">'+km.toFixed(1)+' km</div>',
        iconSize:[0,0], iconAnchor:[0,10]
      })
    }).addTo(map);
  }
  function midpoint(coords){
    // Coordinate that sits at the middle of the polyline by cumulative length.
    if(coords.length<2) return coords[0];
    var total=0, segs=[];
    for(var i=1;i<coords.length;i++){
      var d=map.distance(coords[i-1], coords[i]);
      segs.push(d); total+=d;
    }
    var half=total/2, acc=0;
    for(var j=0;j<segs.length;j++){
      if(acc+segs[j] >= half){
        var t=(half-acc)/segs[j];
        var a=coords[j], b=coords[j+1];
        return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
      }
      acc+=segs[j];
    }
    return coords[Math.floor(coords.length/2)];
  }
  ${pickup && drop ? `
    (function(){
      var a=[${pickup.lng},${pickup.lat}], b=[${drop.lng},${drop.lat}];
      var url='https://router.project-osrm.org/route/v1/driving/'+a.join(',')+';'+b.join(',')+'?overview=full&geometries=geojson&steps=false';
      fetch(url).then(function(r){return r.json();}).then(function(d){
        if(!d || !d.routes || !d.routes[0]){ throw new Error('no route'); }
        var route=d.routes[0];
        var coords=route.geometry.coordinates.map(function(c){return [c[1],c[0]];});
        routeLineBg = L.polyline(coords, { color:'${colors.primary}', weight:7, opacity:.95 }).addTo(map);
        routeLine   = L.polyline(coords, { color:'${colors.accent}',  weight:3.5 }).addTo(map);
        map.fitBounds(routeLineBg.getBounds(), { padding:[50,50] });
        addDistLabel(midpoint(coords), route.distance/1000);
        post({type:'route', distanceKm: route.distance/1000, durationMin: route.duration/60});
      }).catch(function(){
        // Fallback: straight line + straight-line distance.
        var pts=[[${pickup.lat},${pickup.lng}],[${drop.lat},${drop.lng}]];
        routeLineBg=L.polyline(pts,{color:'${colors.primary}',weight:6,opacity:.9,dashArray:'6,6'}).addTo(map);
        map.fitBounds(routeLineBg.getBounds(),{padding:[50,50]});
        var km = map.distance(pts[0], pts[1]) / 1000;
        addDistLabel(midpoint(pts), km);
      });
    })();
  ` : ''}

  // ------------- Simulated nearby vehicles on real roads -------------
  ${traffic ? `
  (function(){
    var VEHICLES = [
      { emoji:'🛵' }, // bike
      { emoji:'🛵' },
      { emoji:'🚕' }, // taxi
      { emoji:'🚖' },
      { emoji:'🚗' }, // cab
      { emoji:'🚙' },
    ];
    var origin = map.getCenter();
    var fleet = [];

    function jitter(pt, radiusM){
      // ~1 deg lat = 111km. Random offset in a disk.
      var r = radiusM * Math.sqrt(Math.random()) / 111000;
      var a = Math.random() * Math.PI * 2;
      var dLat = r * Math.cos(a);
      var dLng = r * Math.sin(a) / Math.cos(pt.lat*Math.PI/180);
      return { lat: pt.lat + dLat, lng: pt.lng + dLng };
    }

    function makeIcon(v){
      return L.divIcon({
        className:'',
        html:'<div class="veh">'+v.emoji+'</div>',
        iconSize:[26,26], iconAnchor:[13,13]
      });
    }

    function requestRoute(from, to, cb){
      var url='https://router.project-osrm.org/route/v1/driving/'
        + from.lng+','+from.lat+';'+to.lng+','+to.lat
        + '?overview=full&geometries=geojson';
      fetch(url).then(function(r){return r.json();}).then(function(d){
        if(d && d.routes && d.routes[0]){
          cb(d.routes[0].geometry.coordinates.map(function(c){return {lat:c[1],lng:c[0]};}));
        } else cb(null);
      }).catch(function(){ cb(null); });
    }

    function spawn(v, i){
      var start = jitter(origin, 900);
      requestRoute(start, jitter(origin, 900), function(path){
        if(!path || path.length<2){ setTimeout(function(){spawn(v,i);}, 3000); return; }
        var marker = L.marker([path[0].lat, path[0].lng], { icon: makeIcon(v), interactive:false }).addTo(map);
        var state = { v:v, marker:marker, path:path, idx:0 };
        fleet[i] = state;
        step(state);
      });
    }

    function step(s){
      if(s.idx >= s.path.length-1){
        // Route finished — pick a new destination from current position.
        var here = s.path[s.path.length-1];
        requestRoute(here, jitter(origin, 900), function(p){
          if(!p || p.length<2){ setTimeout(function(){step(s);}, 2500); return; }
          s.path=p; s.idx=0; step(s);
        });
        return;
      }
      s.idx++;
      var pt = s.path[s.idx];
      s.marker.setLatLng([pt.lat, pt.lng]);
      // Stagger tick speed slightly per vehicle for a natural feel.
      setTimeout(function(){ step(s); }, 700 + Math.random()*400);
    }

    // Stagger spawns so we don't burst OSRM.
    VEHICLES.forEach(function(v, i){
      setTimeout(function(){ spawn(v, i); }, 400 + i*600);
    });
  })();
  ` : ''}

  // ------------- Real online riders (server-driven via socket) -------------
  var liveMarkers = {}; // id -> { marker, vehicle }
  function vehEmoji(v){
    v = (v||'').toLowerCase();
    if(v.indexOf('bike')>=0||v.indexOf('two')>=0||v.indexOf('scoot')>=0||v.indexOf('moped')>=0) return '🏍️';
    if(v.indexOf('taxi')>=0||v.indexOf('auto')>=0||v.indexOf('rick')>=0) return '🚕';
    return '🚗';
  }
  function vehIcon(v){
    return L.divIcon({
      className:'',
      html:'<div class="veh">'+vehEmoji(v)+'</div>',
      iconSize:[26,26], iconAnchor:[13,13]
    });
  }
  function upsertLiveRider(r){
    if(!r || typeof r.lat!=='number' || typeof r.lng!=='number') return;
    var ex = liveMarkers[r.id];
    if(ex){ ex.marker.setLatLng([r.lat, r.lng]); if(r.vehicle && r.vehicle!==ex.vehicle){ ex.marker.setIcon(vehIcon(r.vehicle)); ex.vehicle=r.vehicle; } }
    else { var m = L.marker([r.lat,r.lng],{icon:vehIcon(r.vehicle||''),interactive:false}).addTo(map); liveMarkers[r.id]={marker:m,vehicle:r.vehicle||''}; }
  }
  function removeLiveRider(id){ var ex=liveMarkers[id]; if(ex){ try{ map.removeLayer(ex.marker); }catch(e){} delete liveMarkers[id]; } }
  function setLiveRiders(list){
    var seen = {};
    (list||[]).forEach(function(r){ upsertLiveRider(r); seen[r.id]=true; });
    Object.keys(liveMarkers).forEach(function(id){ if(!seen[id]) removeLiveRider(id); });
  }

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
      else if(d.type==='setLiveRiders'){ setLiveRiders(d.riders||[]); }
      else if(d.type==='upsertLiveRider'){ upsertLiveRider(d.rider); }
      else if(d.type==='removeLiveRider'){ removeLiveRider(d.id); }
    }catch(e){}
  }
</script>
</body></html>`;
}

export default function LeafletMap({
  center, pickup, drop, pickerMode, pinColor, showTraffic, liveRiders, onCenterChange, onReady, onRoute, style,
}: Props) {
  const ref = useRef<WebView>(null);
  const hasLiveRiders = Array.isArray(liveRiders);
  const html = useMemo(
    () => buildHtml({ center, pickup, drop, pickerMode, pinColor, showTraffic, hasLiveRiders }),
    // Only rebuild when these change meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pickerMode, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, showTraffic, hasLiveRiders]
  );

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const d = JSON.parse(e.nativeEvent.data);
      if (d.type === 'center' && onCenterChange) onCenterChange({ lat: d.lat, lng: d.lng });
      if (d.type === 'ready' && onReady) onReady();
      if (d.type === 'route' && onRoute) onRoute({ distanceKm: d.distanceKm, durationMin: d.durationMin });
    } catch { }
  };

  // Imperatively re-center when `center` changes without rebuilding the HTML
  React.useEffect(() => {
    if (!ref.current) return;
    const js = `(function(){try{window.postMessage(JSON.stringify({type:'setCenter',lat:${center.lat},lng:${center.lng},zoom:16}));}catch(e){}})();true;`;
    ref.current.injectJavaScript(js);
  }, [center.lat, center.lng]);

  // Push the current liveRiders list into the WebView whenever it changes.
  const ridersJson = useMemo(() => JSON.stringify(liveRiders || []), [liveRiders]);
  React.useEffect(() => {
    if (!ref.current || !hasLiveRiders) return;
    const js = `(function(){try{window.postMessage(JSON.stringify({type:'setLiveRiders',riders:${ridersJson}}));}catch(e){}})();true;`;
    ref.current.injectJavaScript(js);
  }, [ridersJson, hasLiveRiders]);

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
