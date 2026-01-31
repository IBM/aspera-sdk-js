import './Views.scss';
import { CodeSnippet, Tab, TabList, Tabs } from '@carbon/react';
import React, { useEffect, useState } from 'react';
import hljs from 'highlight.js';

const InstallerViewReact = `const InstallerView = () => {
  /**
   * React function to render a basic installer window
   * Inline styling used to make it easy to copy.
   * After successful init you should usually remove this.
   */

  const [installers, setInstallers] = React.useState([]);

  React.useEffect(() => {
    window.asperaSdk.getInstallerInfo().then(response => {
      // Installers for your platform. While normally just one. Some OS may provide multiple for user to choose.
      setInstallers(response.entries);
    }).catch(error => {
      console.error('Installer info get failed', error);
    });
  }, []);

  const launch = () => {
    window.asperaSdk.launch();
  };

  const install = (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div style={{position: 'fixed', bottom: 0, right: 32, height: 260, width: 280, backgroundColor: '#444', padding: '16px 20px'}}>
      <h4 style={{marginBottom: 20, color: '#fff'}}>IBM Aspera Installer</h4>
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

const InstallerViewAngular = `import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'aspera-installer',
  imports: [CommonModule],
  template: \`
    <div [ngStyle]="wrapperStyle">
      <h4 [ngStyle]="{'margin-bottom': '20px', color: '#fff'}">IBM Aspera Installer</h4>
      <button type="button" [ngStyle]="buttonStyle" (click)="launch()">Launch</button>
      <button type="button" *ngFor="let entry of entries" [ngStyle]="buttonStyle" (click)="install(entry.url)">Install ({{entry.platform}} - {{entry.type}})</button>
    </div>
  \`,
})

export class InstallerView implements OnInit {
  public entries: {platform: string; type: string; url: string; version: string; arch: string}[] = [];
  public wrapperStyle = {position: 'fixed', bottom: '0px', right: '32px', height: '260px', width: '280px', 'background-color': '#444', padding: '16px 20px'};
  public buttonStyle = {display: 'block', width: '100%', 'margin-bottom': '16px', padding: '8px'};

  ngOnInit() {
    window.asperaSdk.getInstallerInfo().then(response => {
      // Installers for your platform. While normally just one. Some OS may provide multiple for user to choose.
      this.entries = response.entries;
    }).catch(error => {
      console.error('Installer info get failed', error);
    });
  }

  public launch() {
    window.asperaSdk.launch();
  }

  public install(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}`;

const InstallerViewVue = `<script setup>
import { ref } from 'vue';

// Value for installer list
const entries = ref([]);
const wrapperStyle = {position: 'fixed', bottom: '0', right: '32px', height: '260px', width: '280px', backgroundColor: '#444', padding: '16px 20px'};
const buttonStyle = {display: 'block', width: '100%', marginBottom: '16px', padding: '8px'};

const launch = () => {
  window.asperaSdk.launch();
};

const install = (url) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

window.asperaSdk.getInstallerInfo().then(response => {
  // Installers for your platform. While normally just one. Some OS may provide multiple for user to choose.
  entries.value = response.entries;
}).catch(error => {
  console.error('Installer info get failed', error);
});
</script>

<template>
  <div :style="wrapperStyle">
    <h4 :style="{marginBottom: '20px', color: '#fff'}">IBM Aspera Installer</h4>
    <button :style="buttonStyle" type="button" @click="launch()">Launch</button>
    <button v-for="entry of entries" :style="buttonStyle" type="button" @click="install(entry.url)">Install ({{entry.platform}} - {{entry.type}})</button>
  </div>
</template>
`;

export default function Installer() {
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    document.querySelectorAll('.cds--snippet-container > pre > code')?.forEach(item => item.classList.add('language-javascript'));
    hljs.highlightAll();
    window.installerAspera();

    return () => {
      document.querySelector('#aspera-installer-test')?.remove();
    }
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
          <Tab>Angular</Tab>
          <Tab>Vue</Tab>
        </TabList>
      </Tabs>
      {[InstallerViewReact, window.installerAspera.toString(), InstallerViewAngular, InstallerViewVue].map((item, index) => getCodeView(item, index))}
    </div>
  );
};
