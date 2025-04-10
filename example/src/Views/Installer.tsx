import './Views.scss';
import { CodeSnippet, Tab, TabList, Tabs } from '@carbon/react';
import React, { useEffect, useState } from 'react';
import hljs from 'highlight.js';

const InstallerViewReact = `export default InstallerView = () => {
  /**
   * React function to render a basic installer window
   * Inline styling used to make it easy to copy.
   */

  const [installers, setInstallers] = React.useState([]);

  React.useEffect(() => {
    window.asperaSdk.getInstallerInfo().then(response => {
      // Installers for your platform. While normally just one. Some OS may provide multiple for user to choose.
      setInstallers(response.entries);
    }).catch(error => {
      console.error('Installer info get failed', error);
    })
  }, []);

  const launch = () => {
    window.asperaSdk.launch();
  };

  const install = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{position: 'fixed', bottom: 0, right: 32, height: 260, width: 280, backgroundColor: '#444', padding: '16px 20px'}}>
      <h4 style={{marginBottom: 20}}>IBM Aspera Installer</h4>
      <button style={{display: 'block', width: '100%', marginBottom: 16, padding: 8}} type="button" onClick={launch}>Launch</button>
      {installers.map(installer => {
        return (
          <button
            key={installer.platform + installer.type}
            style={{display: 'block', width: '100%', marginBottom: 16, padding: 8}}
            type="button"
            onClick={() => install(installer.url)}
          >
            Install ({installer.platform} - {installer.type})
          </button>
        );
      })}
    </div>
  );
};`;

const InstallerViewJavascript = `alert('I am JavaScript!')`;

export default function Installer() {
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    document.querySelectorAll('.cds--snippet-container > pre > code')?.forEach(item => item.classList.add('language-javascript'));
    hljs.highlightAll();
  }, []);

  const getCodeView = (code: string, index: number): React.ReactNode => {
    return <CodeSnippet key={index} type="multi" className={index !== tabIndex ? 'hidden' : ''} feedback="Copied to clipboard" maxCollapsedNumberOfRows={25}>{code}</CodeSnippet>;
  }

  return (
    <div className="example-pages">
      <h2>Code example</h2>
      <Tabs selectedIndex={tabIndex} onChange={(data => setTabIndex(data.selectedIndex))}>
        <TabList>
          <Tab>React</Tab>
          <Tab>JavaScript</Tab>
        </TabList>
      </Tabs>
      {[InstallerViewReact, InstallerViewJavascript].map((item, index) => getCodeView(item, index))}
    </div>
  );
};
