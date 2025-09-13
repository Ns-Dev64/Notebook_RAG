"use client"

import React, { useEffect, useRef, useState } from 'react';

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
  width = '100%'
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mermaid, setMermaid] = useState<MermaidInstance | null>(null);


  // Generate unique ID if not provided
  const diagramId = id || `mermaid-${Math.random().toString(36).substring(2, 9)}`;

  // Default Mermaid configuration
  const defaultConfig = {
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    fontSize: 20,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'cardinal'
    },
    mindmap: {
      maxNodeSizeRatio: 20,
      useMaxWidth: true,
      padding: 40,
      nodeSpacing: 80,
      levelSpacing: 150
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
      primaryColor: '#4a5568',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#2d3748',
      lineColor: '#718096',
      secondaryColor: '#805ad5',
      tertiaryColor: '#d53f8c',
      background: '#1a202c',
      mainBkg: '#2d3748',
      secondBkg: '#4a5568',
      tertiaryBkg: '#718096',
      fontSize: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
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
          mermaidInstance.initialize({
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
    
    if (!mermaid || !chart ) return;
    
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
        console.log("Parse result:", isValid);
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        // Render the diagram
        console.log("Rendering diagram with ID:", diagramId);
        const { svg, bindFunctions } = await mermaid.render(diagramId, chart);
        console.log("Render result:", { svg: svg.substring(0, 100) + "...", bindFunctions: !!bindFunctions });
        
        // Insert SVG into DOM
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
          
            // Add custom styling for mindmaps
            const svgElement = elementRef.current.querySelector('svg');
            if (svgElement) {
              // Improve SVG rendering quality
              svgElement.setAttribute('width', '100%');
              svgElement.setAttribute('height', 'auto');
              svgElement.setAttribute('viewBox', svgElement.getAttribute('viewBox') || '0 0 800 600');
              svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
              svgElement.style.width = '100%';
              svgElement.style.height = 'auto';
              svgElement.style.maxWidth = '100%';
              svgElement.style.shapeRendering = 'geometricPrecision';
              svgElement.style.textRendering = 'optimizeLegibility';
              
              // Add custom CSS for mindmap styling
            const style = document.createElement('style');
            style.textContent = `
              .mermaid-diagram svg {
                width: 100% !important;
                height: auto !important;
                max-width: 100% !important;
                min-height: 400px !important;
                shape-rendering: geometricPrecision !important;
                text-rendering: optimizeLegibility !important;
                image-rendering: -webkit-optimize-contrast !important;
                image-rendering: crisp-edges !important;
                background: #1a202c !important;
              }
              .mermaid-diagram svg .node rect {
                fill: #4a5568 !important;
                stroke: #2d3748 !important;
                stroke-width: 2px !important;
                rx: 8px !important;
                ry: 8px !important;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)) !important;
                min-width: 120px !important;
                min-height: 40px !important;
                shape-rendering: geometricPrecision !important;
              }
              .mermaid-diagram svg .node text {
                fill: #ffffff !important;
                font-weight: 600 !important;
                font-size: 18px !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3) !important;
              }
              .mermaid-diagram svg .edgePath path {
                stroke: #718096 !important;
                stroke-width: 2px !important;
                fill: none !important;
                shape-rendering: geometricPrecision !important;
              }
              .mermaid-diagram svg .edgeLabel {
                background: #2d3748 !important;
                border: 1px solid #4a5568 !important;
                border-radius: 4px !important;
                padding: 4px 8px !important;
                font-size: 16px !important;
                font-weight: 500 !important;
                color: #ffffff !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
              }
              .mermaid-diagram svg .mindmap-node {
                fill: #805ad5 !important;
                stroke: #6b46c1 !important;
                stroke-width: 2px !important;
                min-width: 120px !important;
                min-height: 40px !important;
                shape-rendering: geometricPrecision !important;
              }
              .mermaid-diagram svg .mindmap-node text {
                fill: #ffffff !important;
                font-weight: 600 !important;
                font-size: 18px !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
              }
              .mermaid-diagram svg .root-node {
                fill: #d53f8c !important;
                stroke: #be185d !important;
                stroke-width: 3px !important;
                min-width: 150px !important;
                min-height: 50px !important;
                shape-rendering: geometricPrecision !important;
              }
              .mermaid-diagram svg .root-node text {
                fill: #ffffff !important;
                font-weight: 700 !important;
                font-size: 22px !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
              }
              .mermaid-diagram svg .secondary-node {
                fill: #f59e0b !important;
                stroke: #d97706 !important;
                stroke-width: 2px !important;
                shape-rendering: geometricPrecision !important;
              }
              .mermaid-diagram svg .secondary-node text {
                fill: #ffffff !important;
                font-weight: 600 !important;
                font-size: 16px !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
                text-rendering: optimizeLegibility !important;
                -webkit-font-smoothing: antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
              }
            `;
            elementRef.current.appendChild(style);
          }
          
          // Bind any interactive functions (for flowcharts with click events)
          if (bindFunctions) {
            bindFunctions(elementRef.current);
          }
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
              background: #ffe0e0; 
              color: #d63031;
              text-align: center;
              font-family: monospace;
            ">
              <h4>Mermaid Syntax Error</h4>
              <p>${errorMessage}</p>
              <details style="margin-top: 10px; text-align: left;">
                <summary>Raw Input</summary>
                <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${chart}</pre>
              </details>
            </div>
          `;
        }
        
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    renderDiagram();
  }, [mermaid, chart, diagramId]);

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
        height: height || '500px',
        overflow: 'auto',
        background: '#1a202c',
        borderRadius: '8px',
        border: '1px solid #2d3748',
        padding: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        imageRendering: 'crisp-edges',
        position: 'relative',
        ...style
      }}
    >
      {/* Grid background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          opacity: 0.3,
          pointerEvents: 'none'
        }}
      />
      <div 
        ref={elementRef} 
        className="mermaid-diagram"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          width: '100%',
          imageRendering: 'crisp-edges',
          position: 'relative',
          zIndex: 1
        }}
      />
    </div>
  );
};

export default MermaidDiagram;