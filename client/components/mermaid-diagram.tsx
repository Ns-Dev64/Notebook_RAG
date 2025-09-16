"use client"

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

// Mermaid types
interface MermaidInstance {
  initialize: (config: any) => void;
  parse: (text: string, parseOptions?: any) => Promise<boolean | any>;
  render: (id: string, chart: string) => Promise<{ svg: string; bindFunctions?: (element: HTMLElement) => void }>;
}

interface MermaidDiagramProps {
  chart: string;
  id?: string;
  config?: any;
  className?: string;
  style?: React.CSSProperties;
  onError?: (error: Error) => void;
  onRender?: (element: HTMLElement) => void;
  height?: string;
  width?: string;
  mode?: 'light' | 'dark';
  debug?: boolean;
  onCopyToClipboard?: () => void;
}

// MermaidDiagram Component
const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ 
  chart, 
  id, 
  config = {},
  className = '',
  style = {},
  onError,
  onRender,
  height = 'auto',
  width = '100%',
  mode,
  debug = false,
  onCopyToClipboard
}) => {
  const { resolvedTheme } = useTheme();
  const elementRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mermaid, setMermaid] = useState<MermaidInstance | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showToolbar, setShowToolbar] = useState<boolean>(true);


  // Generate unique ID if not provided
  const diagramId = id || `mermaid-${Math.random().toString(36).substring(2, 9)}`;

  // Palette derived from mode (auto from app theme if not provided)
  const effectiveMode: 'light' | 'dark' = mode ?? (resolvedTheme === 'dark' ? 'dark' : 'light');
  const isDark = effectiveMode === 'dark';
  const palette = {
    background: isDark ? '#000000' : '#ffffff',
    border: isDark ? '#374151' : '#d1d5db',
    nodeFill: isDark ? '#1f2937' : '#f3f4f6',
    nodeStroke: isDark ? '#6b7280' : '#9ca3af',
    textPrimary: isDark ? '#ffffff' : '#111827',
    edge: isDark ? '#d1d5db' : '#6b7280',
    accent: isDark ? '#8b5cf6' : '#7c3aed'
  } as const;

  const toolbarBg = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const toolbarBorder = palette.border;
  const buttonBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const buttonHoverBg = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
  const buttonText = palette.textPrimary;
  const chipBg = isDark ? '#2d3748' : '#edf2f7';

  // Button style helper
  const getButtonStyle = (isActive = false) => ({
    background: isActive ? buttonHoverBg : buttonBg,
    border: 'none',
    color: buttonText,
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '36px',
    height: '36px',
    gap: '4px'
  });

  // Zoom and pan functions
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      e.preventDefault(); // Prevent text selection
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Copy diagram to clipboard
  const handleCopy = async () => {
    if (svgRef.current) {
      try {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
        // You could add a toast notification here
        console.log('Diagram copied to clipboard');
      } catch (err) {
        console.error('Failed to copy diagram:', err);
      }
    }
  };

  // Export diagram as PNG (uses viewBox sizing and Blob URL)
  const handleExportPNG = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      // Compute tight bounds from on-screen SVG
      const bbox = (svg as unknown as SVGGraphicsElement).getBBox();

      // Clone to avoid mutating on-screen SVG
      const clone = svg.cloneNode(true) as SVGSVGElement;

      // Ensure xmlns so rasterizer understands the SVG
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // Apply tight viewBox from bbox
      if (Number.isFinite(bbox.x) && Number.isFinite(bbox.y) && Number.isFinite(bbox.width) && Number.isFinite(bbox.height)) {
        const pad = 8; // small padding
        const vbX = Math.max(0, Math.floor(bbox.x - pad));
        const vbY = Math.max(0, Math.floor(bbox.y - pad));
        const vbW = Math.max(1, Math.ceil(bbox.width + pad * 2));
        const vbH = Math.max(1, Math.ceil(bbox.height + pad * 2));
        clone.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
        clone.setAttribute('width', String(vbW));
        clone.setAttribute('height', String(vbH));
      }

      // Determine output size from viewBox or fallback
      let width = 1200;
      let height = 800;
      const vb = clone.getAttribute('viewBox');
      if (vb) {
        const parts = vb.split(/\s+/).map(Number);
        if (parts.length === 4 && parts.every(n => Number.isFinite(n))) {
          width = Math.max(1, Math.round(parts[2]));
          height = Math.max(1, Math.round(parts[3]));
        }
      } else {
        // If no viewBox, try numeric width/height attrs
        const wAttr = parseFloat(clone.getAttribute('width') || '0');
        const hAttr = parseFloat(clone.getAttribute('height') || '0');
        if (wAttr > 0 && hAttr > 0) {
          width = Math.round(wAttr);
          height = Math.round(hAttr);
        }
      }
      clone.setAttribute('width', String(width));
      clone.setAttribute('height', String(height));

      // Set solid background to match theme so PNG isn't transparent
      const bg = (clone.style.background && clone.style.background !== 'none') ? clone.style.background : '';
      const backgroundColor = bg || (document.body.classList.contains('dark') ? '#000000' : '#ffffff');

      // Remove foreignObjects/html labels and external images which can taint canvas
      clone.querySelectorAll('foreignObject').forEach((n) => n.parentNode?.removeChild(n));
      clone.querySelectorAll('image').forEach((n) => n.parentNode?.removeChild(n));

      // Inject minimal style so exported PNG matches on-screen theme
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        svg { background: ${palette.background}; }
        .node rect { fill: ${palette.nodeFill}; stroke: ${palette.nodeStroke}; }
        .node text { fill: ${palette.textPrimary}; font-weight: 600; font-size: 14px; }
        .edgePath path, line, path { stroke: ${palette.edge}; }
      `;
      clone.insertBefore(styleEl, clone.firstChild);

      // Serialize SVG to Blob URL
      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = new Image();
      // Hint browser to request with CORS in case of embedded external refs
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          return;
        }
        // Paint background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
        // Draw SVG
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(svgUrl);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `diagram-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/png');
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(svgUrl);
        console.error('Failed to load SVG for PNG export', e);
      };
      img.src = svgUrl;
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };


  // Export diagram as SVG
  const handleExportSVG = () => {
    if (svgRef.current) {
      try {
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export SVG:', err);
      }
    }
  };

  // Default Mermaid configuration
  const defaultConfig = {
    startOnLoad: false,
    theme: isDark ? 'dark' : 'base',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontSize: 14,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: false,
      curve: 'cardinal',
      diagramPadding: 20,
      nodeSpacing: 80,
      rankSpacing: 80,
      padding: 20
    },
    mindmap: {
      useMaxWidth: false,
      padding: 50,
      maxNodeWidth: 200,
      maxNodeSizeRatio: 0.15,
      nodeSpacing: 120,
      levelSpacing: 150,
      connectorLineColor: palette.edge,
      connectorLineWidth: 2,
      connectorLineCurvature: 0.3
    },
    gantt: {
      useMaxWidth: true
    },
    journey: {
      useMaxWidth: true
    },
    timeline: {
      useMaxWidth: true
    },
    themeVariables: {
      primaryColor: palette.accent,
      primaryTextColor: palette.textPrimary,
      primaryBorderColor: palette.accent,
      lineColor: palette.edge,
      fontSize: '14px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      background: palette.background,
      mainBkg: palette.background,
      secondBkg: palette.nodeFill,
      tertiaryBkg: palette.nodeFill
    }
  };

  // Load Mermaid dynamically
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        if (!mermaid) {
          // Dynamically import mermaid
          const mermaidModule = await import('mermaid');
          const mermaidInstance = mermaidModule.default;
          
          // Initialize with merged config
          await mermaidInstance.initialize({
            ...defaultConfig,
            ...config
          });
          
          setMermaid(mermaidInstance);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to load Mermaid: ${errorMessage}`);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    loadMermaid();
  }, []);

  // Render diagram when mermaid is loaded and chart changes
  useEffect(() => {
    if (!mermaid || !chart || !chart.trim()) return;
    
    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Clear previous content
        if (elementRef.current) {
          elementRef.current.innerHTML = '';
        }
        
        // Validate syntax first
        const isValid = await mermaid.parse(chart);
        if (debug) {
          console.log("Mermaid parse result:", isValid);
          console.log("Chart content:", chart);
        }
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        // Render the diagram
        if (debug) {
          console.log("Rendering diagram with ID:", diagramId);
        }
        const { svg, bindFunctions } = await mermaid.render(diagramId, chart);
        if (debug) {
          console.log("Render result:", { svg: svg.substring(0, 100) + "...", bindFunctions: !!bindFunctions });
        }
        
        // Insert SVG into DOM
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
          
            // Add custom styling for diagrams
            const svgElement = elementRef.current.querySelector('svg') as SVGSVGElement;
            if (svgElement) {
              // Store reference for zoom/pan operations
              svgRef.current = svgElement;
              
              // Get the original viewBox or calculate it
              const originalViewBox = svgElement.getAttribute('viewBox');
              if (!originalViewBox) {
                // If no viewBox exists, create one based on the SVG dimensions
                const width = svgElement.getAttribute('width') || '800';
                const height = svgElement.getAttribute('height') || '600';
                svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
              }
              
              // Fit SVG to content bounds using viewBox
              const vb = svgElement.getAttribute('viewBox');
              if (!vb) {
                const w = parseFloat(svgElement.getAttribute('width') || '1200');
                const h = parseFloat(svgElement.getAttribute('height') || '800');
                svgElement.setAttribute('viewBox', `0 0 ${Math.max(1, w)} ${Math.max(1, h)}`);
              }
              svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              svgElement.setAttribute('width', '100%');
              svgElement.setAttribute('height', '100%');
              svgElement.style.width = '100%';
              svgElement.style.height = '100%';
              svgElement.style.maxWidth = '100%';
              svgElement.style.maxHeight = '100%';
              svgElement.style.shapeRendering = 'geometricPrecision';
              svgElement.style.textRendering = 'optimizeLegibility';
              
              // Apply zoom and pan transforms
              svgElement.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
              svgElement.style.transformOrigin = 'center center';
              
              // Add custom CSS for diagram styling
            const style = document.createElement('style');
            style.textContent = `
              .mermaid-container * {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
              }
              .mermaid-diagram {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                cursor: grab !important;
              }
              .mermaid-diagram:active {
                cursor: grabbing !important;
              }
              .mermaid-diagram svg {
                width: 100% !important;
                height: 100% !important;
                max-width: 100% !important;
                max-height: 100% !important;
                min-height: 300px !important;
                shape-rendering: geometricPrecision !important;
                text-rendering: optimizeLegibility !important;
                background: ${palette.background} !important;
                overflow: visible !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
              }
              .mermaid-diagram svg * {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
              }
              .mermaid-diagram svg .node rect,
              .mermaid-diagram svg rect {
                fill: ${palette.nodeFill} !important;
                stroke: ${palette.nodeStroke} !important;
                stroke-width: 2px !important;
                rx: 8px !important;
                ry: 8px !important;
                shape-rendering: geometricPrecision !important;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important;
              }
              .mermaid-diagram svg .node text,
              .mermaid-diagram svg text {
                fill: ${palette.textPrimary} !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                dominant-baseline: middle !important;
                text-anchor: middle !important;
              }
              .mermaid-diagram svg .mindmap-node rect {
                fill: ${palette.nodeFill} !important;
                stroke: ${palette.nodeStroke} !important;
                stroke-width: 2px !important;
                rx: 8px !important;
                ry: 8px !important;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important;
              }
              .mermaid-diagram svg .mindmap-node text {
                fill: ${palette.textPrimary} !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.2) !important;
                dominant-baseline: middle !important;
                text-anchor: middle !important;
              }
              .mermaid-diagram svg .edgePath path,
              .mermaid-diagram svg path,
              .mermaid-diagram svg line {
                stroke: ${palette.edge} !important;
                stroke-width: 2px !important;
                fill: none !important;
                opacity: 0.8 !important;
                stroke-linecap: round !important;
                stroke-linejoin: round !important;
              }
              .mermaid-diagram svg .mindmap-link {
                stroke: ${palette.edge} !important;
                stroke-width: 2px !important;
                opacity: 0.8 !important;
                stroke-linecap: round !important;
                stroke-linejoin: round !important;
              }
              .mermaid-diagram svg .edgeLabel {
                background: ${isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)'} !important;
                border: 1px solid ${palette.accent} !important;
                border-radius: 4px !important;
                padding: 2px 6px !important;
                font-size: 11px !important;
                font-weight: 600 !important;
                color: ${palette.textPrimary} !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                backdrop-filter: blur(10px) !important;
              }
              .mermaid-diagram svg .mindmap-node {
                fill: ${palette.nodeFill} !important;
                stroke: ${palette.nodeStroke} !important;
                stroke-width: 2px !important;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important;
              }
              .mermaid-diagram svg .mindmap-node circle {
                fill: ${palette.nodeFill} !important;
                stroke: ${palette.nodeStroke} !important;
                stroke-width: 3px !important;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important;
              }
              .mermaid-diagram svg .arrowheadPath {
                fill: ${palette.edge} !important;
                stroke: ${palette.edge} !important;
                stroke-width: 1px !important;
              }
              .mermaid-diagram svg .arrowheadPath path {
                fill: ${palette.edge} !important;
                stroke: ${palette.edge} !important;
                stroke-width: 1px !important;
              }
              .mermaid-diagram svg marker path {
                fill: ${palette.edge} !important;
                stroke: ${palette.edge} !important;
                stroke-width: 1px !important;
              }
            `;
            elementRef.current.appendChild(style);
          } else {
            // Fallback if SVG element is not found
            if (debug) {
              console.warn("SVG element not found after rendering");
            }
          }
          
          // Bind any interactive functions (for flowcharts with click events)
          if (bindFunctions) {
            bindFunctions(elementRef.current);
          }
          
          // Apply final styling adjustments
          setTimeout(() => {
            if (elementRef.current) {
              const svg = elementRef.current.querySelector('svg');
              if (svg) {
                // Ensure proper text alignment
                const allTexts = svg.querySelectorAll('text');
                allTexts.forEach((text: any) => {
                  text.setAttribute('pointer-events', 'none');
                  text.setAttribute('dominant-baseline', 'middle');
                  text.setAttribute('text-anchor', 'middle');
                });
              }
            }
          }, 100);
        }

        console.log("Diagram rendered successfully");
        setIsLoading(false);
        if (elementRef.current) {
          onRender?.(elementRef.current);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Render error: ${errorMessage}`);
        setIsLoading(false);
        
        // Show error in the diagram area
        if (elementRef.current) {
          elementRef.current.innerHTML = `
            <div style="
              padding: 20px; 
              border: 2px dashed #ff6b6b; 
              border-radius: 8px; 
              background: ${isDark ? '#2d1b1b' : '#ffe0e0'}; 
              color: ${isDark ? '#ff6b6b' : '#d63031'};
              text-align: center;
              font-family: monospace;
            ">
              <h4 style="margin: 0 0 10px 0; font-size: 16px;">Mermaid Syntax Error</h4>
              <p style="margin: 0 0 15px 0; font-size: 14px;">${errorMessage}</p>
              <details style="margin-top: 10px; text-align: left;">
                <summary style="cursor: pointer; font-weight: bold;">Raw Input</summary>
                <pre style="background: ${isDark ? '#1a1a1a' : '#f8f9fa'}; padding: 10px; border-radius: 4px; overflow-x: auto; margin-top: 10px; font-size: 12px; color: ${isDark ? '#e0e0e0' : '#333'};">${chart}</pre>
              </details>
            </div>
          `;
        }
        
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    renderDiagram();
  }, [mermaid, chart, diagramId]);

  // Update transform when zoom or pan changes
  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    }
  }, [zoom, panX, panY]);

  // Loading state
  if (isLoading && !error) {
    return (
      <div 
        className={`mermaid-loading ${className}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          background: '#f8f9fa',
          borderRadius: '8px',
          ...style
        }}
      >
        <div style={{ textAlign: 'center', color: '#6c757d' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e9ecef',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }}></div>
          Loading diagram...
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      className={`mermaid-container ${className}`}
      style={{
        width,
        height: height || '600px',
        minHeight: '400px',
        maxHeight: '800px',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${palette.background} 0%, ${isDark ? '#0a0a0a' : '#f8fafc'} 100%)`,
        borderRadius: '16px',
        border: `2px solid ${palette.border}`,
        padding: '20px',
        boxShadow: isDark 
          ? '0 12px 40px rgba(0,0,0,0.8), 0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        imageRendering: 'crisp-edges',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        backdropFilter: 'blur(10px)',
        ...style
      }}
    >
      {/* Toolbar */}
      {showToolbar && (
        <div 
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            display: 'flex',
            gap: '6px',
            background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '12px',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            backdropFilter: 'blur(20px)',
            boxShadow: isDark 
              ? '0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)' 
              : '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05)'
          }}
        >
          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            style={{
              background: buttonBg,
              border: 'none',
              color: buttonText,
              padding: '8px 12px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '36px',
              height: '36px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Zoom Out"
          >
            −
          </button>
          <span
            style={{
              color: buttonText,
              padding: '8px 12px',
              fontSize: '12px',
              minWidth: '50px',
              textAlign: 'center',
              background: buttonBg,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '36px',
              fontWeight: '600'
            }}
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Zoom In"
          >
            +
          </button>
          
          <div style={{ 
            width: '1px', 
            background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)', 
            margin: '0 6px',
            height: '20px',
            alignSelf: 'center'
          }} />
          
          {/* Reset */}
          <button
            onClick={handleResetZoom}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Reset Zoom"
          >
            Reset
          </button>
          
          <div style={{ 
            width: '1px', 
            background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)', 
            margin: '0 6px',
            height: '20px',
            alignSelf: 'center'
          }} />
          
          {/* Copy */}
          <button
            onClick={handleCopy}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Copy Diagram"
          >
            Copy
          </button>
          
          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Export as PNG"
          >
            PNG
          </button>
          
          {/* Export SVG */}
          <button
            onClick={handleExportSVG}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Export as SVG"
          >
            SVG
          </button>
          
          {/* Mermaid Live Link */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(chart);
              onCopyToClipboard?.();
              window.open('https://mermaid.live', '_blank');
            }}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Open in Mermaid Live Editor"
          >
            📊 Live
          </button>
          
          {/* Toggle Toolbar */}
          <button
            onClick={() => setShowToolbar(false)}
            style={getButtonStyle()}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = buttonHoverBg;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = buttonBg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Hide Toolbar"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Show Toolbar Button (when hidden) */}
      {!showToolbar && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <button
            onClick={() => {
              navigator.clipboard.writeText(chart);
              onCopyToClipboard?.();
              window.open('https://mermaid.live', '_blank');
            }}
            style={{
              background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              color: buttonText,
              padding: '8px 12px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              backdropFilter: 'blur(20px)',
              boxShadow: isDark 
                ? '0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)' 
                : '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Open in Mermaid Live Editor"
          >
            📊 Live
          </button>
          <button
            onClick={() => setShowToolbar(true)}
            style={{
              background: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              color: buttonText,
              padding: '8px',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              backdropFilter: 'blur(20px)',
              boxShadow: isDark 
                ? '0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.2)' 
                : '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="Show Toolbar"
          >
            ⚙️
          </button>
        </div>
      )}
      {/* Grid background */}
      {/* Simple background only (no grid) */}
      <div 
        ref={elementRef} 
        className="mermaid-diagram"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          imageRendering: 'crisp-edges',
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default MermaidDiagram;