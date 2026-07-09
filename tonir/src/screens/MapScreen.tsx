import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, Pressable, StyleSheet, StatusBar, Dimensions, Image, ScrollView, Platform, TextInput,
} from 'react-native';
import { PlatformWebView } from '../components/PlatformWebView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { useVenues } from '../hooks/useVenues';
import { VenueRow } from '../lib/database.types';
import { Icon } from '../components/Icon';
import { Stars } from '../components/Stars';
import { TimePill } from '../components/TimePill';
import { FONTS, COLORS } from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// Obtain a free key at https://developer.tech.yandex.ru
const YANDEX_MAPS_API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Map'>;
  route: RouteProp<RootStackParamList, 'Map'>;
};

const KIND_COLORS: Record<string, string> = {
  restaurant: COLORS.primary,
  bar: COLORS.accent,
  lounge: COLORS.loungeColor,
  club: COLORS.pop,
};

const MAP_FILTER_KEYS = ['all', 'restaurants', 'bars', 'tonight'] as const;
type MapFilterKey = typeof MAP_FILTER_KEYS[number];

// NOTE: buildHtml / MAP_HTML are currently unused — the screen renders Leaflet.
// If Yandex is re-enabled, use this lookup instead of the hardcoded lang string.
const YANDEX_LANG: Record<string, string> = {
  hy: 'ru_RU',  // Yandex has no Armenian UI; Russian is the correct fallback
  ru: 'ru_RU',
  en: 'en_US',
};

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden}
    #map{width:100%;height:100%}
    .pw{display:flex;flex-direction:column;align-items:center;cursor:pointer;transform:translate(-50%,-100%);position:relative}
    .pb{width:36px;height:36px;border-radius:18px;border:2.5px solid #fff;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:transform .15s,box-shadow .15s;position:relative}
    .pb img{width:100%;height:100%;object-fit:cover}
    .pt{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid;margin-top:-1px}
    .hd{position:absolute;top:-1px;right:-1px;width:10px;height:10px;border-radius:5px;background:#E8743B;border:1.5px solid #fff}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var venues=__VENUES__;
    var mm={};
    var mi;
    function post(obj){var s=JSON.stringify(obj);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*');}
    var kc={restaurant:'#1F4D3E',bar:'#C9A961',lounge:'#9B59B6',club:'#E8743B'};
    function addMarker(v){
      var color=kc[v.kind]||'#1F4D3E';
      var wrap=document.createElement('div');wrap.className='pw';
      var body=document.createElement('div');body.className='pb';body.style.backgroundColor=color;
      var img=document.createElement('img');img.src=v.photo_url;body.appendChild(img);
      if(v.heat==='high'){var dot=document.createElement('div');dot.className='hd';body.appendChild(dot);}
      wrap.appendChild(body);
      var tip=document.createElement('div');tip.className='pt';tip.style.borderTopColor=color;wrap.appendChild(tip);
      wrap.onclick=function(){post({type:'pin_tap',id:v.id});};
      var marker=new ymaps3.YMapMarker({coordinates:[v.coord_x,v.coord_y]},wrap);
      mi.addChild(marker);
      mm[v.id]={m:marker,el:wrap,body:body};
    }
    function updateVisible(ids){Object.keys(mm).forEach(function(id){mm[id].el.style.display=ids.indexOf(id)>=0?'':'none';});}
    function selectMarker(id){
      Object.keys(mm).forEach(function(mid){
        var b=mm[mid].body;
        if(mid===id){b.style.transform='scale(1.25)';b.style.boxShadow='0 4px 16px rgba(0,0,0,.4)';}
        else{b.style.transform='';b.style.boxShadow='';}
      });
      if(id&&mm[id]){var v=venues.find(function(x){return x.id===id;});if(v)mi.setLocation({center:[v.coord_x,v.coord_y],zoom:15,duration:300});}
    }
    window.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='updateVisible')updateVisible(d.ids);else if(d.type==='selectMarker')selectMarker(d.id);}catch(err){}});
    var ys=document.createElement('script');
    ys.src='https://api-maps.yandex.ru/v3/?apikey=__API_KEY__&lang=__LANG__';
    ys.onload=function(){
      ymaps3.ready.then(function(){
        mi=new ymaps3.YMap(document.getElementById('map'),{location:{center:[44.5152,40.1872],zoom:14}});
        mi.addChild(new ymaps3.YMapDefaultSchemeLayer({}));
        mi.addChild(new ymaps3.YMapDefaultFeaturesLayer({}));
        venues.forEach(addMarker);
        window.panToLocation=function(lat,lng){mi.setLocation({center:[lng,lat],duration:300});};
        window.zoomIn=function(){var loc=mi.location;mi.setLocation({zoom:(loc.zoom||14)+1,duration:200});};
        post({type:'map_ready'});
      }).catch(function(e){post({type:'map_error',msg:String(e)});});
    };
    ys.onerror=function(){post({type:'map_error',msg:'Yandex Maps failed to load – check API key referrer settings'});};
    document.head.appendChild(ys);
  </script>
</body>
</html>`;

function buildHtml(venues: VenueRow[], lang: string): string {
  const data = JSON.stringify(
    venues.map((v) => ({
      id: v.id,
      kind: v.kind,
      coord_x: v.coord_x,
      coord_y: v.coord_y,
      photo_url: v.photo_url,
      heat: v.heat,
    }))
  );
  return MAP_HTML
    .replace('__API_KEY__', YANDEX_MAPS_API_KEY)
    .replace('__LANG__', YANDEX_LANG[lang] ?? 'ru_RU')
    .replace('__VENUES__', data)
    .replace(
      /var kc=\{[^}]+\};/,
      `var kc=${JSON.stringify({
        restaurant: COLORS.primary,
        bar:        COLORS.accent,
        lounge:     COLORS.loungeColor,
        club:       COLORS.pop,
      })};`
    );
}

// ─── Web: Leaflet + OpenStreetMap (no API key required) ───────────────────────
const LEAFLET_VERSION = '1.9.4';
const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%;overflow:hidden}
    .lc{cursor:pointer}
    .lb{width:36px;height:36px;border-radius:50%;border:2.5px solid #fff;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.3);position:relative;transition:transform .15s}
    .lb img{width:100%;height:100%;object-fit:cover}
    .lt{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid;margin:0 auto;margin-top:-1px}
    .lh{position:absolute;top:-1px;right:-1px;width:10px;height:10px;border-radius:5px;background:#E8743B;border:1.5px solid #fff}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js"></script>
  <script>
    var venues=__VENUES__;
    var mm={};
    function post(obj){var s=JSON.stringify(obj);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*');}
    var kc={restaurant:'#1F4D3E',bar:'#C9A961',lounge:'#9B59B6',club:'#E8743B'};
    var map=L.map('map',{zoomControl:false}).setView([40.1872,44.5152],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
    function panToLocation(lat,lng){map.panTo([lat,lng]);}
    function zoomIn(){map.setZoom(map.getZoom()+1);}
    function makeIcon(v){
      var color=kc[v.kind]||'#1F4D3E';
      var hd=v.heat==='high'?'<div class="lh"></div>':'';
      return L.divIcon({html:'<div class="lc"><div class="lb" style="background:'+color+'">'+hd+'<img src="'+v.photo_url+'"/></div><div class="lt" style="border-top-color:'+color+'"></div></div>',className:'',iconSize:[36,46],iconAnchor:[18,46]});
    }
    function addMarker(v){
      var m=L.marker([v.coord_y,v.coord_x],{icon:makeIcon(v)}).addTo(map);
      m.on('click',function(){post({type:'pin_tap',id:v.id});});
      mm[v.id]={m:m};
    }
    function updateVisible(ids){Object.keys(mm).forEach(function(id){var el=mm[id].m.getElement();if(el)el.style.display=ids.indexOf(id)>=0?'':'none';});}
    function selectMarker(id){
      Object.keys(mm).forEach(function(mid){var el=mm[mid].m.getElement();if(!el)return;if(mid===id){el.style.transform='scale(1.25)';el.style.zIndex='1000';}else{el.style.transform='';el.style.zIndex='';}});
      if(id&&mm[id])map.panTo(mm[id].m.getLatLng());
    }
    venues.forEach(addMarker);
    post({type:'map_ready'});
    window.addEventListener('message',function(e){try{var d=JSON.parse(e.data);if(d.type==='updateVisible')updateVisible(d.ids);else if(d.type==='selectMarker')selectMarker(d.id);}catch(err){}});
  </script>
</body>
</html>`;

function buildLeafletHtml(venues: VenueRow[]): string {
  const data = JSON.stringify(
    venues.map((v) => ({
      id: v.id,
      kind: v.kind,
      coord_x: v.coord_x,
      coord_y: v.coord_y,
      photo_url: v.photo_url,
      heat: v.heat,
    }))
  );
  return LEAFLET_HTML
    .replace('__VENUES__', data)
    .replace(
      /var kc=\{[^}]+\};/,
      `var kc=${JSON.stringify({
        restaurant: COLORS.primary,
        bar:        COLORS.accent,
        lounge:     COLORS.loungeColor,
        club:       COLORS.pop,
      })};`
    );
}

export function MapScreen({ navigation, route }: Props) {
  const { focusVenueId } = route.params ?? {};
  const { theme: t } = useStore();
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const [selectedId, setSelectedId] = useState<string | null>(focusVenueId ?? null);
  const [activeFilter, setActiveFilter] = useState<MapFilterKey>('all');
  const [mapReady, setMapReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const { venues } = useVenues();
  const webViewRef = useRef<any>(null);
  const selectedVenue = venues.find((v) => v.id === selectedId) ?? null;

  const searchResults = searchQuery.trim().length > 0
    ? venues.filter((v) => {
        const q = searchQuery.toLowerCase();
        return v.name.toLowerCase().includes(q) || (v.cuisine ?? '').toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const filteredVenues = venues.filter((v) => {
    if (activeFilter === 'restaurants') return v.kind === 'restaurant';
    if (activeFilter === 'bars') return v.kind === 'bar' || v.kind === 'lounge';
    if (activeFilter === 'tonight') return v.heat !== 'low';
    return true;
  });

  // webViewRef.current is either a native WebView (has injectJavaScript)
  // or the raw iframe element on web (has contentWindow).
  function sendToMap(type: string, payload: Record<string, any>) {
    const ref = webViewRef.current;
    if (!ref) return;
    if (typeof ref.injectJavaScript === 'function') {
      let code: string;
      if (type === 'updateVisible') {
        code = `updateVisible(${JSON.stringify(payload.ids)}); true;`;
      } else if (type === 'selectMarker') {
        code = `selectMarker(${JSON.stringify(payload.id)}); true;`;
      } else if (type === 'panToLocation') {
        code = `panToLocation(${payload.lat}, ${payload.lng}); true;`;
      } else if (type === 'zoomIn') {
        code = `zoomIn(); true;`;
      } else {
        code = `true;`;
      }
      ref.injectJavaScript(code);
    } else if (ref.contentWindow) {
      ref.contentWindow.postMessage(JSON.stringify({ type, ...payload }), '*');
    }
  }

  async function locateUser() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    sendToMap('panToLocation', { lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  function getAvailableTimes(times: string[]): string[] {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return times.filter((time) => {
      const [h, m] = time.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return true;
      return h * 60 + m > currentMinutes;
    });
  }

  useEffect(() => {
    if (!mapReady) return;
    const ids = filteredVenues.map((v) => v.id);
    sendToMap('updateVisible', { ids });
  }, [filteredVenues, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    sendToMap('selectMarker', { id: selectedId });
  }, [selectedId, mapReady]);

  function onMessage(event: any) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'map_ready') setMapReady(true);
      else if (msg.type === 'pin_tap') setSelectedId((prev) => (prev === msg.id ? null : msg.id));
    } catch {}
  }

  const mapHtml = useMemo(
    () => buildLeafletHtml(venues),
    [venues]
  );

  return (
    <View style={[styles.screen, { backgroundColor: t.bgAlt }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      <PlatformWebView
        webViewRef={webViewRef}
        html={mapHtml}
        style={StyleSheet.absoluteFill}
        onMessage={onMessage}
        scrollEnabled={false}
      />

      {/* Top chrome */}
      <View style={[styles.topChrome, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topRow}>
          <Pressable onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }} style={[styles.iconBtn, { backgroundColor: t.surface }]}>
            <Icon name="chevL" size={20} color={t.text} />
          </Pressable>
          <View style={[styles.searchPill, { backgroundColor: t.surface }]}>
            <Icon name="search" size={15} color={searchFocused ? t.primary : t.textMute} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => { if (!searchQuery) setSearchFocused(false); }}
              placeholder={tr('map_search_placeholder' as any)}
              placeholderTextColor={t.textMute}
              style={[styles.searchInput, { color: t.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => { setSearchQuery(''); setSearchFocused(false); }} hitSlop={8}>
                <Icon name="x" size={14} color={t.textMute} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
          style={{ marginTop: 10 }}
        >
          {MAP_FILTER_KEYS.map((f) => (
            <Pressable
              key={f}
              onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveFilter(f); }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? t.primary : t.surface,
                  borderColor: activeFilter === f ? t.primary : t.border,
                },
              ]}
            >
              <Text style={[styles.filterChipText, { color: activeFilter === f ? COLORS.cream : t.text }]}>
                {tr(`map_filter_${f}` as any)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {searchResults.length > 0 && (
          <View style={[styles.searchDropdown, { backgroundColor: t.surface }]}>
            {searchResults.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedId(v.id);
                  setActiveFilter('all');
                  setSearchQuery('');
                  setSearchFocused(false);
                }}
                style={[styles.searchResultRow, { borderBottomColor: t.border }]}
              >
                <Icon name="pin" size={14} color={t.primary} strokeWidth={2} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.searchResultName, { color: t.text }]}>{v.name}</Text>
                  <Text style={[styles.searchResultMeta, { color: t.textMute }]}>{v.cuisine} · {v.area}</Text>
                </View>
                <Icon name="chevR" size={14} color={t.textFaint} />
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Right-side controls */}
      <View style={[styles.rightControls, { top: insets.top + 110 }]}>
        {[
          { icon: 'pin' as const, label: 'Locate' },
          { icon: 'plus' as const, label: 'Zoom in' },
          { icon: 'sliders' as const, label: 'Filters' },
        ].map((c) => (
          <Pressable
            key={c.label}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (c.icon === 'pin') { locateUser(); }
              if (c.icon === 'plus') { sendToMap('zoomIn', {}); }
              if (c.icon === 'sliders') navigation.goBack();
            }}
            style={[styles.rightBtn, { backgroundColor: t.surface }]}
          >
            <Icon name={c.icon} size={18} color={t.text} strokeWidth={2} />
          </Pressable>
        ))}
      </View>

      {/* List CTA */}
      {!selectedVenue && (
        <View style={styles.listCta}>
          <Pressable
            onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.goBack(); }}
            style={[styles.listCtaBtn, { backgroundColor: t.primaryDeep }]}
          >
            <Icon name="search" size={16} color={COLORS.cream} strokeWidth={2} />
            <Text style={styles.listCtaText}>{tr('map_list_view' as any)}</Text>
          </Pressable>
        </View>
      )}

      {/* Peek sheet */}
      {selectedVenue && (
        <View style={[styles.peekSheet, { backgroundColor: t.surface, bottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('Detail', { venueId: selectedVenue.id }); }}
            style={styles.peekInner}
          >
            <Image source={{ uri: selectedVenue.photo_url }} style={styles.peekPhoto} />
            <View style={styles.peekInfo}>
              <Text style={[styles.peekName, { color: t.text }]}>{selectedVenue.name}</Text>
              <Text style={[styles.peekMeta, { color: t.textMute }]}>
                {selectedVenue.cuisine} · {selectedVenue.distance_km}
              </Text>
              <Stars rating={selectedVenue.rating} t={t} size={12} compact />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {getAvailableTimes(selectedVenue.times).slice(0, 4).map((time) => (
                    <TimePill key={time} time={time} t={t} size="sm" />
                  ))}
                </View>
              </ScrollView>
            </View>
            <Icon name="chevR" size={18} color={t.textFaint} />
          </Pressable>
          <Pressable
            onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedId(null); }}
            style={[styles.peekClose, { backgroundColor: t.bgAlt }]}
            hitSlop={8}
          >
            <Icon name="x" size={14} color={t.textMute} strokeWidth={2} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  searchPillText: { fontSize: 14, flex: 1 },
  filterChips: { gap: 8, paddingHorizontal: 0 },
  filterChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  rightControls: {
    position: 'absolute',
    right: 16,
    gap: 8,
  },
  rightBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  listCta: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  listCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  listCtaText: {
    color: COLORS.cream,
    fontSize: 14,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  peekSheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
    elevation: 12,
  },
  peekInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  peekPhoto: {
    width: 72,
    height: 72,
    borderRadius: 12,
    flexShrink: 0,
  },
  peekInfo: { flex: 1, gap: 2 },
  peekName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: -0.2 },
  peekMeta: { fontSize: 12 },
  peekClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchDropdown: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchResultName: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  searchResultMeta: { fontSize: 12, marginTop: 2 },
});
