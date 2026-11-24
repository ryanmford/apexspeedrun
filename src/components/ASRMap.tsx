import React, { useEffect, useRef, useContext, forwardRef, useImperativeHandle } from "react";
import { Plus, Minus, Satellite, Map as MapIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { trackEvent, cn } from "../lib/asr-utils";
import { isSignificantGpsMove } from "../lib/geo-utils";
import { ThemeContext } from "../theme-context";
import { useAppStore } from "../store/useAppStore";
import { CourseData } from "../types";

export interface ASRMapHandle {
  locateUser: () => void;
  resetView: () => void;
  frameCourseAndUser: (courseCoords: [number, number]) => void;
}

export interface ASRMapProps {
  courses?: CourseData[];
  totalCourses?: number;
  searchQuery?: string;
  onCourseClick?: (course: CourseData) => void;
  onPinClick?: (course: CourseData) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onMapClick?: () => void;
  theme?: string | null;
  className?: string;
  hideControls?: boolean;
}

export const ASRMap = forwardRef<ASRMapHandle, ASRMapProps>(({
  courses = [],
  totalCourses = 0,
  searchQuery = "",
  onCourseClick,
  onPinClick,
  onBoundsChange,
  onMapClick,
  theme: propTheme,
  className,
  hideControls = false,
}, ref) => {
  const contextTheme = useContext(ThemeContext);
  const theme = propTheme || contextTheme;
  const isDark = theme === "dark";

  const activeCourseId = useAppStore(s => s.activeCourseId);
  const activeCourseIdRef = useRef(activeCourseId);
  useEffect(() => {
    activeCourseIdRef.current = activeCourseId;
  }, [activeCourseId]);

  const isLocating = useAppStore(s => s.isMapLocating);
  const setIsLocating = useAppStore(s => s.setIsMapLocating);
  const mapReady = useAppStore(s => s.isMapReady);
  const setMapReady = useAppStore(s => s.setIsMapReady);
  const userLocation = useAppStore(s => s.userLocation);
  const setUserLocation = useAppStore(s => s.setUserLocation);
  const setMapViewport = useAppStore(s => s.setMapViewport);
  const mapLayerMode = useAppStore(s => s.mapLayerMode);
  const setMapLayerMode = useAppStore(s => s.setMapLayerMode);
  const setCourseSortMode = useAppStore(s => s.setCourseSortMode);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const tileLayersRef = useRef<{ light?: L.TileLayer; dark?: L.TileLayer; satellite?: L.TileLayer }>({});
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const courseCoordsRef = useRef<Map<string, [number, number]>>(new Map());
  const prevActiveCourseIdRef = useRef<string | null>(null);
  const lastIconUserLocRef = useRef<[number, number] | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const locateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingDegRef = useRef<number | null>(null);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const fitMapToCourses = React.useCallback(() => {
    if (!mapReady || !mapRef.current || !courses) return;

    const bounds = L.latLngBounds([]);
    let validCoordsCount = 0;
    let lastValidCoord = null;

    courses.forEach((c: CourseData & { parsedCoords?: [number, number], isDivider?: boolean }) => {
      if (c.parsedCoords && !c.isDivider) {
        bounds.extend(c.parsedCoords);
        validCoordsCount++;
        lastValidCoord = c.parsedCoords;
      }
    });

    if (validCoordsCount === 1 && lastValidCoord) {
      const isDesktop = window.innerWidth >= 768;
      const panelWidth = window.innerWidth >= 1024 ? 450 : 400;
      const pt = mapRef.current.project(lastValidCoord, 14);
      if (isDesktop) pt.x -= (panelWidth / 2);
      else pt.y += (window.innerHeight * 0.15); // Offset for mobile bottom drawer
      const targetLatLng = mapRef.current.unproject(pt, 14);
      mapRef.current.flyTo(targetLatLng, 14, { duration: 1.5 });
    } else if (validCoordsCount > 1) {
      if (bounds.isValid()) {
        const isDesktop = window.innerWidth >= 768;
        const panelWidth = window.innerWidth >= 1024 ? 450 : 400;
        mapRef.current.fitBounds(bounds, {
          paddingTopLeft: isDesktop ? [panelWidth + 16, 50] : [16, 50],
          paddingBottomRight: isDesktop ? [50, 50] : [16, window.innerHeight * 0.3 + 50],
          maxZoom: 12,
          duration: 1.5,
        });
      }
    } else {
       const isMobile = window.innerWidth < 768;
       const defaultCenter: L.LatLngTuple = isMobile ? [28, -100] : [15, -90];
       const defaultZoom = isMobile ? 2 : 3;
       mapRef.current.flyTo(defaultCenter, defaultZoom, { duration: 1.5 });
    }
  }, [courses, mapReady]);

  const resetViewToDefault = React.useCallback(() => {
    if (!mapReady || !mapRef.current) return;
    setMapViewport(null);
    const isMobile = window.innerWidth < 768;
    const defaultCenter: L.LatLngTuple = isMobile ? [28, -100] : [15, -90];
    const defaultZoom = isMobile ? 2 : 3;
    mapRef.current.stop();
    mapRef.current.flyTo(defaultCenter, defaultZoom, { duration: 1.0 });
  }, [mapReady, setMapViewport]);

  const frameCourseAndUser = React.useCallback((courseCoords: [number, number]) => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    map.stop();
    const currentLoc = useAppStore.getState().userLocation;
    const isDesktop = window.innerWidth >= 768;
    const panelWidth = window.innerWidth >= 1024 ? 450 : 400;

    if (currentLoc) {
      const bounds = L.latLngBounds([currentLoc, courseCoords]);
      map.fitBounds(bounds, {
        paddingTopLeft: isDesktop ? [panelWidth + 48, 64] : [36, 64],
        paddingBottomRight: isDesktop ? [64, 64] : [36, window.innerHeight * 0.35 + 48],
        maxZoom: 15,
        duration: 1.25,
      });
    } else {
      const pt = map.project(courseCoords, 15);
      if (isDesktop) pt.x -= panelWidth / 2;
      else pt.y += window.innerHeight * 0.18;
      map.flyTo(map.unproject(pt, 15), 15, { duration: 1.25 });
    }
  }, [mapReady]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    locateUser: handleFindMe,
    resetView: resetViewToDefault,
    frameCourseAndUser,
  }));

  const onCourseClickRef = useRef(onCourseClick);
  const onPinClickRef = useRef(onPinClick);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMapClickRef = useRef(onMapClick);

  useEffect(() => { onCourseClickRef.current = onCourseClick; }, [onCourseClick]);
  useEffect(() => { onPinClickRef.current = onPinClick; }, [onPinClick]);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Keep a ref of isDark for the cluster icon creator
  const isDarkRef = useRef(isDark);
  useEffect(() => {
    isDarkRef.current = isDark;
    
    // Attempt to force clusters to redraw to apply the new theme
    if (clusterGroupRef.current) {
        clusterGroupRef.current.refreshClusters();
    }
  }, [isDark]);

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const isMobile = window.innerWidth < 768;
    // Set map to focus on Americas and Hawaii on mobile, keep original for desktop
    const defaultCenter: L.LatLngTuple = isMobile ? [28, -100] : [15, -90];
    const defaultZoom = isMobile ? 2 : 3;
    const savedViewport = useAppStore.getState().mapViewport;
    const initialCenter: L.LatLngTuple = savedViewport ? savedViewport.center : defaultCenter;
    const initialZoom = savedViewport ? savedViewport.zoom : defaultZoom;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: [
        [-90, -180],
        [90, 180]
      ],
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
      dragging: true,
      touchZoom: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
    }).setView(initialCenter, initialZoom);

    // Dedicated pane above marker/cluster panes (z-index 600) so clusters never bury the user dot
    const userPane = map.createPane("userLocationPane");
    userPane.style.zIndex = "650";
    userPane.style.pointerEvents = "none";

    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    let lightTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    let darkTileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    
    if (mapboxToken) {
      const lightStyle = import.meta.env.VITE_MAPBOX_LIGHT_STYLE || "mapbox/light-v11";
      const darkStyle = import.meta.env.VITE_MAPBOX_DARK_STYLE || "mapbox/dark-v11";
      lightTileUrl = `https://api.mapbox.com/styles/v1/${lightStyle}/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;
      darkTileUrl = `https://api.mapbox.com/styles/v1/${darkStyle}/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;
    }

    const lightLayer = L.tileLayer(lightTileUrl, {
      maxZoom: 20,
      noWrap: true,
      className: "transition-opacity duration-[1000ms] ease-in-out",
    }).addTo(map);

    let darkLayerClass = "transition-opacity duration-[1000ms] ease-in-out";
    if (!mapboxToken) {
      darkLayerClass += " map-tiles-dark";
    }

    const darkLayer = L.tileLayer(darkTileUrl, {
      maxZoom: 20,
      noWrap: true,
      className: darkLayerClass,
    }).addTo(map);

    const satelliteUrl = mapboxToken
      ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`
      : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

    const satelliteLayer = L.tileLayer(satelliteUrl, {
      maxZoom: 20,
      maxNativeZoom: 19,
      noWrap: true,
      className: "transition-opacity duration-[600ms] ease-in-out",
    }).addTo(map);

    const initialLayerMode = useAppStore.getState().mapLayerMode;
    if (initialLayerMode === "satellite") {
      satelliteLayer.setOpacity(1);
      lightLayer.setOpacity(0);
      darkLayer.setOpacity(0);
    } else {
      satelliteLayer.setOpacity(0);
      lightLayer.setOpacity(isDarkRef.current ? 0 : 1);
      darkLayer.setOpacity(isDarkRef.current ? 1 : 0);
    }
    tileLayersRef.current = { light: lightLayer, dark: darkLayer, satellite: satelliteLayer };

    const getClusterIcon = (cluster: L.MarkerCluster) => {
      const count = cluster.getChildCount();
      let gradientStyle = "linear-gradient(90deg, #52525b, #a1a1aa, #f4f4f5, #a1a1aa, #52525b)";
      if (count > 50) {
        gradientStyle = "linear-gradient(90deg, #52525b, #a1a1aa, #f4f4f5, #a1a1aa, #52525b)";
      }
      if (count > 150) {
        gradientStyle = "linear-gradient(90deg, #52525b, #a1a1aa, #f4f4f5, #a1a1aa, #52525b)";
      }

      const currentIsDark = isDarkRef.current;
      const outerShadow = currentIsDark ? 'shadow-[0_4px_12px_rgba(0,0,0,0.6)]' : 'shadow-[0_4px_12px_rgba(0,0,0,0.2)]';
      const innerSurface = currentIsDark 
        ? 'bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.8)]' 
        : 'bg-white shadow-[inset_0_2px_3px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.1)]';
      const textColor = currentIsDark ? 'text-white' : 'text-zinc-900';

      return L.divIcon({
        html: `
          <div class="relative flex items-center justify-center w-full h-full transition-transform duration-300 hover:scale-110 group cursor-pointer ${outerShadow} rounded-full">
            <div class="absolute inset-0 rounded-full z-0 animate-border-shift blur-[4px] opacity-60" style="background: ${gradientStyle}; background-size: 200% 100%;"></div>
            <div class="absolute inset-0 rounded-full z-0 animate-border-shift opacity-90" style="background: ${gradientStyle}; background-size: 200% 100%;"></div>
            <div class="absolute inset-[1.5px] rounded-full z-10 backdrop-blur-md transition-colors ${innerSurface}"></div>
            <div class="absolute inset-[3px] rounded-full z-10 transition-colors shadow-[inset_0_0_10px_rgba(255,255,255,0.1)]"></div>
            <span class="relative z-20 ${textColor} font-black text-xs sm:text-sm tracking-tighter drop-shadow-md">
               ${count}
            </span>
          </div>
        `,
        className: "bg-transparent",
        iconSize: [50, 50],
      });
    };

    const clusterGroup = L.markerClusterGroup({
      chunkedLoading: false,
      maxClusterRadius: 50,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: getClusterIcon,
    });
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    mapRef.current = map;
    setMapReady(true);

    return () => {
      // Map cleanup
      if (locateTimeoutRef.current !== null) {
        clearTimeout(locateTimeoutRef.current);
        locateTimeoutRef.current = null;
      }
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (orientationListenerRef.current) {
        window.removeEventListener("deviceorientation", orientationListenerRef.current, true);
        window.removeEventListener("deviceorientationabsolute", orientationListenerRef.current as EventListener, true);
        orientationListenerRef.current = null;
      }
      setIsLocating(false);
      userMarkerRef.current = null;
      markersRef.current.clear();
      courseCoordsRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []); // Run once on mount

  // Map Event Handlers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if ((e.originalEvent as MouseEvent & { _markerClicked?: boolean })._markerClicked) return;
      if (onMapClickRef.current) {
        onMapClickRef.current();
      }
    };
    
    const triggerBounds = () => {
      const center = map.getCenter();
      setMapViewport({
        center: [center.lat, center.lng],
        zoom: map.getZoom(),
      });
      if (onBoundsChangeRef.current) {
         const bounds = map.getBounds();
         onBoundsChangeRef.current({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
         });
      }
    };

    map.on('click', handleMapClick);
    map.on('moveend', triggerBounds);
    triggerBounds();

    return () => {
      map.off('click', handleMapClick);
      map.off('moveend', triggerBounds);
    };
  }, [mapReady, setMapViewport]);

  // ResizeObserver for Container
  useEffect(() => {
    if (!mapReady || !mapContainerRef.current || !mapRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
         if (entry.target === mapContainerRef.current) {
            requestAnimationFrame(() => {
              if (mapRef.current) {
                mapRef.current.invalidateSize();
              }
            });
         }
      }
    });

    observer.observe(mapContainerRef.current);
    
    return () => {
       observer.disconnect();
    };
  }, [mapReady]);

  // Solve Leaflet Gray Tiles bug when map mounts or views transition
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [mapReady]);

  // Theme & Satellite synchronization for Tiles
  useEffect(() => {
    if (!tileLayersRef.current) return;
    const { light, dark, satellite } = tileLayersRef.current;
    if (light && dark && satellite) {
      if (mapLayerMode === "satellite") {
        satellite.setOpacity(1);
        dark.setOpacity(0);
        light.setOpacity(0);
      } else {
        satellite.setOpacity(0);
        if (isDark) {
          dark.setOpacity(1);
          light.setOpacity(0);
        } else {
          light.setOpacity(1);
          dark.setOpacity(0);
        }
      }
    }
  }, [isDark, mapLayerMode]);

  // Helpers for hover feature
  const getCourseDisplayName = (fullName: string): string => {
    if (!fullName) return "";
    const trimmed = fullName.trim();
    const match = trimmed.match(/^(.*?)(?:\s+SPEED[\s_-]*RUN|\s+SPEEDRUN)/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    const fallbackMatch = trimmed.match(/^(.*?)(?:SPEED[\s_-]*RUN|SPEEDRUN)/i);
    if (fallbackMatch && fallbackMatch[1].trim()) {
      return fallbackMatch[1].trim();
    }
    return trimmed;
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Helper to create marker icon
  const createPinIcon = (courseName: string, isActive: boolean, coords?: [number, number] | null) => {
    const currentIsDark = isDarkRef.current;
    const outerShadow = currentIsDark ? 'shadow-[0_4px_12px_rgba(0,0,0,0.6)]' : 'shadow-[0_4px_12px_rgba(0,0,0,0.2)]';
    const innerSurface = currentIsDark 
      ? 'bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.8)]' 
      : 'bg-white shadow-[inset_0_2px_3px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.1)]';

    const dotClasses = currentIsDark 
      ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
      : 'bg-zinc-900 shadow-[0_0_12px_rgba(0,0,0,0.3)]';

    const stemClasses = currentIsDark
      ? 'from-white/80'
      : 'from-zinc-900/60';

    const tooltipClasses = currentIsDark
      ? 'bg-zinc-950/95 text-white border-white/20 shadow-[0_4px_20px_rgba(0,0,0,0.85)]'
      : 'bg-white/95 text-zinc-950 border-black/15 shadow-[0_4px_16px_rgba(0,0,0,0.15)]';

    const activeOuterClasses = isActive ? 'scale-[1.5] z-[1000] brightness-125' : 'hover:scale-[1.15] active:scale-95 drop-shadow-lg';
    
    const shortName = getCourseDisplayName(courseName);
    const escapedShortName = escapeHtml(shortName);

    const currentLoc = useAppStore.getState().userLocation;
    const resolvedCoords = coords || courseCoordsRef.current.get(courseName);
    let distBadgeHtml = "";
    if (currentLoc && resolvedCoords) {
      const km = L.latLng(currentLoc).distanceTo(resolvedCoords) / 1000;
      distBadgeHtml = `<span class="ml-1.5 pl-1.5 border-l ${currentIsDark ? 'border-white/20 text-blue-400' : 'border-black/15 text-blue-600'} tabular-nums">${km.toFixed(2)} KM</span>`;
    }

    const hoverPillHtml = escapedShortName
      ? `<div class="absolute bottom-[38px] left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 ease-out translate-y-1 group-hover:translate-y-0 scale-95 group-hover:scale-100 z-50 whitespace-nowrap">
           <div class="relative flex items-center px-2.5 py-1 rounded-full border backdrop-blur-md ${tooltipClasses}">
             <span class="text-[10px] sm:text-[11px] font-mono font-black tracking-widest uppercase select-none leading-none flex items-center">
               ${escapedShortName}${distBadgeHtml}
             </span>
           </div>
         </div>`
      : "";

    return L.divIcon({
      html: `
        <div class="asr-pin relative flex flex-col items-center justify-center group transition-all duration-300 cursor-pointer ${activeOuterClasses}" style="width: 44px; height: 44px;">
          ${hoverPillHtml}
          <div class="absolute inset-0 bg-transparent"></div>
          <div class="relative flex flex-col items-center mt-2">
            <div class="relative w-6 h-6 rounded-full flex items-center justify-center ${outerShadow}">
              <div class="absolute inset-0 rounded-full animate-border-shift neon-gradient-base blur-[4px] opacity-50 z-0"></div>
              <div class="absolute inset-0 rounded-full animate-border-shift neon-gradient-base opacity-90 z-0"></div>
              <div class="absolute inset-[1.5px] rounded-full z-10 backdrop-blur-md transition-colors ${innerSurface}"></div>
              <div class="relative z-20 w-1.5 h-1.5 rounded-full ${dotClasses} ${isActive ? 'scale-125' : 'group-hover:scale-125'} transition-all"></div>
            </div>
            <div class="w-[2px] h-[8px] bg-gradient-to-b ${stemClasses} to-transparent rounded-b-full"></div>
          </div>
        </div>
      `,
      className: "bg-transparent",
      iconSize: [44, 44],
      iconAnchor: [22, 38],
    });
  };

  // Marker Syncing
  useEffect(() => {
    if (!mapReady || !clusterGroupRef.current) return;
    
    const currentCourseIds = new Set(courses.map((c: CourseData) => c.name));
    
    // Remove markers that are no longer in `courses`
    const markersToRemove: L.Marker[] = [];
    for (const [id, marker] of markersRef.current.entries()) {
       if (!currentCourseIds.has(id)) {
          markersToRemove.push(marker);
          markersRef.current.delete(id);
          courseCoordsRef.current.delete(id);
       }
    }

    if (markersToRemove.length > 0) {
       clusterGroupRef.current.removeLayers(markersToRemove);
    }

    // Add or update markers Let's add new markers without blowing up the whole cluster.
    const newMarkers: L.Marker[] = [];

    courses.forEach((c: CourseData & { parsedCoords?: [number, number] }) => {
      const id = c.name;
      if (!c.parsedCoords) return;
      courseCoordsRef.current.set(id, c.parsedCoords);

      const isActive = activeCourseId === id;

      if (!markersRef.current.has(id)) {
         const marker = L.marker(c.parsedCoords, {
            icon: createPinIcon(c.name, isActive, c.parsedCoords)
         });

         marker.on("mouseover", () => {
            marker.setZIndexOffset(10000);
         });

         marker.on("mouseout", () => {
            const isCurrentActive = activeCourseIdRef.current === id;
            marker.setZIndexOffset(isCurrentActive ? 1000 : 0);
         });

         marker.on("click", (e) => {
            (e.originalEvent as MouseEvent & { _markerClicked?: boolean })._markerClicked = true;
            if (!mapRef.current || !c.parsedCoords) return;

            // Intelligent Panning
            const currentZoom = Math.max(mapRef.current.getZoom(), 12);
            const pt = mapRef.current.project(c.parsedCoords, currentZoom);
            const isDesktop = window.innerWidth >= 768;

            if (!isDesktop) {
               const targetLatLng = mapRef.current.unproject(L.point(pt.x, pt.y + (window.innerHeight * 0.22)), currentZoom);
               mapRef.current.flyTo(targetLatLng, currentZoom, { duration: 1.0 });
            } else {
               const panelWidth = window.innerWidth >= 1024 ? 450 : 400;
               const targetLatLng = mapRef.current.unproject(L.point(pt.x - (panelWidth / 2), pt.y), currentZoom);
               mapRef.current.flyTo(targetLatLng, currentZoom, { duration: 1.0 });
            }

            if (onPinClickRef.current) onPinClickRef.current(c);
            else if (onCourseClickRef.current) onCourseClickRef.current(c);
         });

         markersRef.current.set(id, marker);
         newMarkers.push(marker);
      }
    });

    if (newMarkers.length > 0) {
      clusterGroupRef.current.addLayers(newMarkers);
    }

  }, [courses, mapReady]); 

  // O(1) Active Pin State update: only redraw previous & current active marker
  useEffect(() => {
    if (!mapReady) return;
    const prevId = prevActiveCourseIdRef.current;
    if (prevId && prevId !== activeCourseId) {
      const prevMarker = markersRef.current.get(prevId);
      if (prevMarker) {
        prevMarker.setIcon(createPinIcon(prevId, false, courseCoordsRef.current.get(prevId)));
        prevMarker.setZIndexOffset(0);
      }
    }
    if (activeCourseId) {
      const nextMarker = markersRef.current.get(activeCourseId);
      if (nextMarker) {
        nextMarker.setIcon(
          createPinIcon(activeCourseId, true, courseCoordsRef.current.get(activeCourseId)),
        );
        nextMarker.setZIndexOffset(1000);
      }
    }
    prevActiveCourseIdRef.current = activeCourseId;
  }, [activeCourseId, mapReady]);

  // Theme changes redraw all pin icons
  useEffect(() => {
    if (!mapReady) return;
    for (const [id, marker] of markersRef.current.entries()) {
      const isActive = activeCourseIdRef.current === id;
      marker.setIcon(createPinIcon(id, isActive, courseCoordsRef.current.get(id)));
      marker.setZIndexOffset(isActive ? 1000 : 0);
    }
  }, [isDark, mapReady]);

  // Distance-gated User Location updates (only rebuild marker distance badges when moved > 50m)
  useEffect(() => {
    if (!mapReady || !userLocation) return;
    const prevLoc = lastIconUserLocRef.current;
    if (!isSignificantGpsMove(prevLoc, userLocation, 0.05)) {
      return;
    }
    lastIconUserLocRef.current = userLocation;
    for (const [id, marker] of markersRef.current.entries()) {
      const isActive = activeCourseIdRef.current === id;
      marker.setIcon(createPinIcon(id, isActive, courseCoordsRef.current.get(id)));
    }
  }, [userLocation, mapReady]);

  const applyHeadingToDom = React.useCallback((deg: number | null) => {
    const el = userMarkerRef.current?.getElement();
    if (!el) return;
    const wrap = el.querySelector(".asr-location-heading-wrap") as HTMLElement | null;
    if (!wrap) return;
    if (deg === null || Number.isNaN(deg)) {
      wrap.style.opacity = "0";
    } else {
      wrap.style.opacity = "1";
      wrap.style.transform = `rotate3d(0, 0, 1, ${deg.toFixed(1)}deg)`;
    }
  }, []);

  const createUserLocationIcon = React.useCallback((currentIsDark: boolean) => {
    const h = headingDegRef.current;
    const headingStyle = h !== null && !Number.isNaN(h)
      ? `opacity: 1; transform: rotate3d(0, 0, 1, ${h.toFixed(1)}deg);`
      : `opacity: 0;`;

    return L.divIcon({
      html: `
        <div class="asr-location-puck">
          <div class="asr-location-heading-wrap" style="${headingStyle}">
            <svg class="asr-location-heading-cone" viewBox="0 0 80 80" fill="none">
              <defs>
                <radialGradient id="asrHeadingBeamGrad" cx="40" cy="40" r="36" gradientUnits="userSpaceOnUse">
                  <stop offset="18%" stop-color="#4285F4" stop-opacity="0.55" />
                  <stop offset="100%" stop-color="#4285F4" stop-opacity="0" />
                </radialGradient>
              </defs>
              <path d="M40 40 L21 6 A39 39 0 0 1 59 6 Z" fill="url(#asrHeadingBeamGrad)" />
            </svg>
          </div>
          <div class="asr-location-halo"></div>
          <div class="asr-location-pulse-ring"></div>
          <div class="asr-location-base ${currentIsDark ? "asr-location-base--dark" : ""}">
            <div class="asr-location-core"></div>
          </div>
        </div>
      `,
      className: "asr-user-location-marker",
      iconSize: [80, 80],
      iconAnchor: [40, 40],
    });
  }, []);

  const startCompassTracking = React.useCallback(() => {
    if (orientationListenerRef.current || typeof window === "undefined") return;

    const attachListener = () => {
      if (orientationListenerRef.current) return;
      const handler = (event: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
        let heading: number | null = null;
        if (typeof event.webkitCompassHeading === "number" && event.webkitCompassHeading >= 0) {
          heading = event.webkitCompassHeading;
        } else if (event.absolute && typeof event.alpha === "number") {
          heading = (360 - event.alpha) % 360;
        } else if (typeof event.alpha === "number") {
          heading = (360 - event.alpha) % 360;
        }
        if (heading !== null && !Number.isNaN(heading)) {
          headingDegRef.current = heading;
          applyHeadingToDom(heading);
        }
      };
      orientationListenerRef.current = handler;
      window.addEventListener("deviceorientationabsolute", handler as EventListener, true);
      window.addEventListener("deviceorientation", handler, true);
    };

    const DevOrient = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (DevOrient && typeof DevOrient.requestPermission === "function") {
      DevOrient.requestPermission()
        .then((state) => {
          if (state === "granted") attachListener();
        })
        .catch(() => {
          // Compass permission optional; location dot still works without beam
        });
    } else {
      attachListener();
    }
  }, [applyHeadingToDom]);

  const upsertUserMarker = React.useCallback((latitude: number, longitude: number) => {
    if (!mapRef.current) return;
    if (userMarkerRef.current && mapRef.current.hasLayer(userMarkerRef.current)) {
      userMarkerRef.current.setLatLng([latitude, longitude]);
      applyHeadingToDom(headingDegRef.current);
    } else {
      userMarkerRef.current = L.marker([latitude, longitude], {
        icon: createUserLocationIcon(isDarkRef.current),
        pane: "userLocationPane",
        interactive: false,
      }).addTo(mapRef.current);
    }
  }, [createUserLocationIcon, applyHeadingToDom]);

  const startLocationWatch = React.useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (watchPos) => {
        const nextLoc: [number, number] = [watchPos.coords.latitude, watchPos.coords.longitude];
        setUserLocation(nextLoc);
        upsertUserMarker(nextLoc[0], nextLoc[1]);
        if (typeof watchPos.coords.heading === "number" && !Number.isNaN(watchPos.coords.heading) && watchPos.coords.heading >= 0) {
          headingDegRef.current = watchPos.coords.heading;
          applyHeadingToDom(watchPos.coords.heading);
        }
      },
      () => {
        // Keep last known position marker on transient GPS dropouts
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [setUserLocation, upsertUserMarker, applyHeadingToDom]);

  // Restore & sync user location marker whenever map mounts (e.g. returning from another app tab) or location updates
  useEffect(() => {
    if (!mapReady || !mapRef.current || !userLocation) return;
    upsertUserMarker(userLocation[0], userLocation[1]);
    startLocationWatch();
  }, [mapReady, userLocation, upsertUserMarker, startLocationWatch]);

  // Recover cleanly when returning from a backgrounded browser tab
  useEffect(() => {
    if (!mapReady) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && mapRef.current) {
        mapRef.current.invalidateSize();
        const savedLoc = useAppStore.getState().userLocation;
        if (savedLoc) {
          upsertUserMarker(savedLoc[0], savedLoc[1]);
          if (userMarkerRef.current) {
            userMarkerRef.current.setIcon(createUserLocationIcon(isDarkRef.current));
          }
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [mapReady, upsertUserMarker, createUserLocationIcon]);

  // User Marker theming
  useEffect(() => {
    if (userMarkerRef.current && mapRef.current?.hasLayer(userMarkerRef.current)) {
      userMarkerRef.current.setIcon(createUserLocationIcon(isDark));
    }
  }, [isDark, createUserLocationIcon]);

  const prevSearchQueryRef = useRef(searchQuery);

  // CAMERA DIRECTOR: Automatic Map Framing
  useEffect(() => {
    if (!mapReady || !mapRef.current || !courses) return;

    const activeCoursesCount = courses.filter((c: CourseData & { isDivider?: boolean }) => c && !c.isDivider).length;
    const isFiltered = activeCoursesCount < totalCourses * 0.95 && activeCoursesCount > 0;
    
    // If we're showing all courses (or near all), we don't force recenter.
    // Let the user stay where they are reading the map.
    if (!isFiltered || !searchQuery) {
      prevSearchQueryRef.current = searchQuery;
      return;
    }

    // Only recenter if the actual search query caused this filtering change
    // Don't recenter just because the user toggled the "All Time" / "Open" flag
    if (searchQuery === prevSearchQueryRef.current) {
      return;
    }
    prevSearchQueryRef.current = searchQuery;

    fitMapToCourses();
  }, [courses, totalCourses, mapReady, searchQuery, fitMapToCourses]);

  const flyToLocation = React.useCallback((latitude: number, longitude: number) => {
    const map = mapRef.current;
    if (!map) return;
    map.stop();
    const currentZoom = map.getZoom();
    const distMeters = map.getCenter().distanceTo([latitude, longitude]);
    const targetZoom =
      currentZoom < 14
        ? 14
        : distMeters < 300 && currentZoom < 16
          ? Math.min(currentZoom + 1, 16)
          : currentZoom;
    const duration = distMeters < 50 && targetZoom === currentZoom ? 0.35 : 1.2;
    map.flyTo([latitude, longitude], targetZoom, { duration });
  }, []);

  const handleFindMe = () => {
    if (!mapRef.current || !navigator.geolocation) return;
    trackEvent("map_find_me_click", { status: "requested" });
    startCompassTracking();

    // If we already have a session location fix, respond instantaneously on click
    const knownLoc = useAppStore.getState().userLocation;
    const alreadyFlew = Boolean(knownLoc);
    if (knownLoc) {
      setCourseSortMode("nearest");
      upsertUserMarker(knownLoc[0], knownLoc[1]);
      flyToLocation(knownLoc[0], knownLoc[1]);
    }

    setIsLocating(true);
    if (locateTimeoutRef.current !== null) {
      clearTimeout(locateTimeoutRef.current);
    }
    locateTimeoutRef.current = setTimeout(() => {
      setIsLocating(false);
      locateTimeoutRef.current = null;
    }, 12000);

    const finishLocating = () => {
      if (locateTimeoutRef.current !== null) {
        clearTimeout(locateTimeoutRef.current);
        locateTimeoutRef.current = null;
      }
      setIsLocating(false);
    };

    const onPositionSuccess = (pos: GeolocationPosition) => {
      finishLocating();
      if (!mapRef.current) return;
      const { latitude, longitude } = pos.coords;
      const prevLoc = useAppStore.getState().userLocation;
      setUserLocation([latitude, longitude]);
      setCourseSortMode("nearest");
      upsertUserMarker(latitude, longitude);
      startLocationWatch();

      if (!alreadyFlew) {
        flyToLocation(latitude, longitude);
      } else if (prevLoc && L.latLng(prevLoc).distanceTo([latitude, longitude]) > 25) {
        mapRef.current.stop();
        mapRef.current.panTo([latitude, longitude], { animate: true, duration: 0.8 });
      }
      trackEvent("map_find_me_success");
    };

    navigator.geolocation.getCurrentPosition(
      onPositionSuccess,
      (err) => {
        // Code 1 = PERMISSION_DENIED; otherwise fall back to fast Wi-Fi/cached network location
        if (err.code === 1) {
          finishLocating();
          return;
        }
        navigator.geolocation.getCurrentPosition(
          onPositionSuccess,
          () => finishLocating(),
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 120000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  const handleToggleLayerMode = () => {
    const nextMode = mapLayerMode === "satellite" ? "street" : "satellite";
    setMapLayerMode(nextMode);
    trackEvent("map_layer_toggle", { mode: nextMode });
  };

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div
      id="asr-map-container"
      className={cn(
        "relative w-full overflow-hidden shadow-2xl transition-colors duration-500 [&_.leaflet-container]:!bg-transparent",
        isDark ? "shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" : "",
        className || "h-[60vh] sm:h-[75vh] min-h-[500px] rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 dark:border-zinc-800"
      )}
    >
      <div ref={mapContainerRef} className="absolute inset-0 z-[10]" />

      {/* Map Controls - Top Right */}
      <div className="absolute top-4 right-2 sm:right-4 z-[40] flex flex-col gap-3 pointer-events-none">
        {/* Locate Me Button */}
        {!hideControls && (
          <>
            <button
              onClick={handleFindMe}
              title="Find my location"
              aria-label="Find my location"
              className={cn(
                "pointer-events-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                isDark
                  ? "bg-black border-zinc-800 text-white hover:bg-zinc-900 focus-visible:ring-offset-[#030303] shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                  : "bg-white border-slate-200 text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-slate-50 theme-focus"
              )}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="10"
                  className={cn(
                    isDark ? "fill-blue-500/25" : "fill-blue-500/20",
                    isLocating && "animate-pulse"
                  )}
                />
                <circle
                  cx="11"
                  cy="11"
                  r="6.5"
                  className="fill-white"
                  stroke="rgba(37, 99, 235, 0.2)"
                  strokeWidth="0.5"
                />
                <circle
                  cx="11"
                  cy="11"
                  r="4.75"
                  className={cn(
                    "fill-blue-500 transition-transform duration-200 origin-center",
                    isLocating && "scale-90"
                  )}
                />
              </svg>
            </button>

            {/* Satellite / Street Geometry Toggle */}
            <button
              onClick={handleToggleLayerMode}
              title={mapLayerMode === "satellite" ? "Switch to Street Map" : "Switch to Satellite Imagery"}
              aria-label={mapLayerMode === "satellite" ? "Switch to Street Map" : "Switch to Satellite Imagery"}
              aria-pressed={mapLayerMode === "satellite"}
              className={cn(
                "pointer-events-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full border transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                mapLayerMode === "satellite"
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)]"
                  : isDark
                    ? "bg-black border-zinc-800 text-white hover:bg-zinc-900 focus-visible:ring-offset-[#030303] shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                    : "bg-white border-slate-200 text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-slate-50 theme-focus"
              )}
            >
              {mapLayerMode === "satellite" ? (
                <MapIcon size={18} strokeWidth={2.5} />
              ) : (
                <Satellite size={18} strokeWidth={2.25} />
              )}
            </button>
          </>
        )}

        {/* Zoom Controls (Desktop Only) */}
        <div className={cn(
          "pointer-events-auto relative flex flex-col items-center p-0.5 rounded-[2rem] transition-all duration-300 group hidden md:flex",
          isDark ? "shadow-[0_4px_12px_rgba(0,0,0,0.6)]" : "shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
        )}>
          <div className="absolute inset-0 rounded-[2rem] pointer-events-none">
            <div className="absolute inset-0 rounded-[2rem] neon-gradient-base animate-border-shift blur-[6px] opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
            <div className="absolute inset-0 rounded-[2rem] neon-gradient-base animate-border-shift opacity-50 group-hover:opacity-90 transition-opacity duration-300" />
            <div className={cn(
              "absolute inset-[1.5px] rounded-[2rem] z-10 backdrop-blur-md transition-colors",
              isDark ? "bg-zinc-900 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.8)]" : "bg-white shadow-[inset_0_2px_3px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.1)]"
            )} />
          </div>

          <button
            onClick={handleZoomIn}
            className={cn(
              "relative z-20 p-2.5 rounded-t-full transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isDark ? "text-white hover:bg-white/10" : "text-zinc-900 hover:bg-black/5"
            )}
          >
            <Plus size={18} strokeWidth={2.5}/>
          </button>
          <div className={cn("relative z-20 w-4 h-px my-0.5", isDark ? "bg-white/10" : "bg-black/10")} />
          <button
            onClick={handleZoomOut}
            className={cn(
              "relative z-20 p-2.5 rounded-b-full transition-all active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isDark ? "text-white hover:bg-white/10" : "text-zinc-900 hover:bg-black/5"
            )}
          >
            <Minus size={18} strokeWidth={2.5}/>
          </button>
        </div>
      </div>
    </div>
  );
});
