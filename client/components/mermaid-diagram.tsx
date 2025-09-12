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
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: 'cardinal'
    },
    mindmap: {
      maxNodeSizeRatio: 12,
      useMaxWidth: true
    },
    gantt: {
      useMaxWidth: true
    },
    journey: {
      useMaxWidth: true
    },
    timeline: {
      useMaxWidth: true
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
    if (!mermaid || !chart || !elementRef.current) return;

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
        if (!isValid) {
          throw new Error('Invalid Mermaid syntax');
        }

        // Render the diagram
        const { svg, bindFunctions } = await mermaid.render(diagramId, chart);
        
        // Insert SVG into DOM
        if (elementRef.current) {
          elementRef.current.innerHTML = svg;
          
          // Bind any interactive functions (for flowcharts with click events)
          if (bindFunctions) {
            bindFunctions(elementRef.current);
          }
        }

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
        height,
        overflow: 'auto',
        ...style
      }}
    >
      <div 
        ref={elementRef} 
        className="mermaid-diagram"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      />
    </div>
  );
};

export default MermaidDiagram;