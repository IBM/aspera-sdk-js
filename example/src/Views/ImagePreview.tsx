import './Views.scss';
import { Button, CodeSnippet } from '@carbon/react';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js';

export default function ImagePreview() {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [imageData, setImageData] = useState<{data: string; type: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.querySelector('.cds--snippet-container > pre > code')?.classList.add('language-javascript');
    hljs.highlightAll();
  }, []);

  const handleSelectAndPreview = async () => {
    setLoading(true);
    setError(null);
    setImageData(null);
    setSelectedFile('');

    try {
      await window.selectAndPreviewImageAspera();
    } catch (err) {
      console.error('Failed to select and preview image', err);
    } finally {
      setLoading(false);
    }
  };

  // Listen for updates from the window object
  useEffect(() => {
    const checkForData = setInterval(() => {
      if (window.imagePreviewData) {
        setImageData(window.imagePreviewData);
        window.imagePreviewData = null;
      }
      if (window.selectedImagePath) {
        setSelectedFile(window.selectedImagePath);
        window.selectedImagePath = null;
      }
    }, 100);

    return () => clearInterval(checkForData);
  }, []);

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <CodeSnippet type="multi" feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{window.selectAndPreviewImageAspera.toString()}</CodeSnippet>
      <h2>Try it out</h2>
      <div className="input-group">
        <Button
          onClick={handleSelectAndPreview}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Select file'}
        </Button>
      </div>
      <div className="ending-content">
        {error && (
          <div className="error-message">
            <h4>Error</h4>
            <p>{error}</p>
          </div>
        )}
        {imageData && (
          <div className="image-preview-container">
            <div className="image-display">
              <img
                src={`data:${imageData.type};base64,${imageData.data}`}
                alt="Preview"
                style={{
                  maxWidth: '150px',
                  maxHeight: '150px',
                  objectFit: 'contain',
                  padding: '2px',
                  backgroundColor: '#f4f4f4'
                }}
              />
            </div>
          </div>
        )}
        {selectedFile && (
          <div>
            <p>{selectedFile}</p>
          </div>
        )}
      </div>
    </div>
  );
}
