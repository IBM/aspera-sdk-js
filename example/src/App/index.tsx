import './App.scss';
import { init, launch, testConnection, registerStatusCallback } from '@ibm-aspera/sdk';
import { Header, HeaderGlobalAction, HeaderGlobalBar, HeaderName, Theme, Tab, TabList, Tabs, Button } from '@carbon/react';
import { LogoGithub, Notification, NotificationOff, Sdk } from '@carbon/icons-react';
import { Route, Routes, useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import Initialize from '../Views/Initialize';
import Test from '../Views/Test';
import StartTransfer from '../Views/StartTransfer';
import MonitorTransfers from '../Views/MonitorTransfers';
import SelectItems from '../Views/SelectItems';
import Installer from '../Views/Installer';
import DragDrop from '../Views/DragDrop';
import Other from '../Views/Other';
import Home from '../Views/Home';
import AllTogether from '../Views/AllTogether';

export const tabItems = [
  {route: '/', name: 'Home', component: <Home />},
  {route: '/init', name: 'Initialize', component: <Initialize />, row: 1},
  {route: '/test', name: 'Test', component: <Test />, row: 1},
  {route: '/installer', name: 'Installing', component: <Installer />, row: 4},
  {route: '/select-items', name: 'Select items', component: <SelectItems />, row: 3},
  {route: '/start-transfer', name: 'Start transfer', component: <StartTransfer />, row: 2},
  {route: '/manage-transfer', name: 'Manage transfers', component: <MonitorTransfers />, row: 2},
  {route: '/drag-drop', name: 'Drag & drop', component: <DragDrop />, row: 3},
  {route: '/other', name: 'Other', component: <Other />, row: 1},
  {route: '/all', name: 'All together', component: <AllTogether />},
];

export default function App() {
  const [disableAlert, setDisableAlert] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  hljs.registerLanguage('javascript', javascript);
  let initialized = false;

  useEffect(() => {
    // Prevent drag and drop testing from reloading page
    window.addEventListener('drop', event => {
      event.preventDefault();
    });
    window.addEventListener('dragover', event => {
      event.preventDefault();
    });
  }, []);

  const openGithub = (): void => {
    window.open('https://github.com/IBM/aspera-sdk-js', '_blank', 'noopener,noreferrer');
  };

  const openSDKdocs = (): void => {
    window.open('https://ibm.github.io/aspera-sdk-js/docs/', '_blank', 'noopener,noreferrer');
  };

  const toggleAlert = (): void => {
    const newValue = !disableAlert;

    if (newValue) {
      window.alert = (data) => {
        console.info(data);
      };
    } else {
      window.location.reload();
    }

    setDisableAlert(newValue);
  }

  const openPath = (path: string): void => {
    navigate(path);
  };

  const header = (
    <Header aria-label="Carbon Tutorial">
      <HeaderName prefix="IBM Aspera">JavaScript SDK Test Application</HeaderName>
      <HeaderGlobalBar>
        <HeaderGlobalAction aria-label={disableAlert ? 'Enable alerts (needs reload)' : 'Disable alerts'} tooltipAlignment="end" className="action-icons" onClick={toggleAlert}>
          {disableAlert ? <Notification size={20} /> : <NotificationOff size={20} />}
        </HeaderGlobalAction>
        <HeaderGlobalAction aria-label="Github" tooltipAlignment="end" className="action-icons" onClick={openGithub}>
          <LogoGithub size={20} />
        </HeaderGlobalAction>
        <HeaderGlobalAction aria-label="SDK Docs" tooltipAlignment="end" className="action-icons" onClick={openSDKdocs}>
          <Sdk size={20} />
        </HeaderGlobalAction>
      </HeaderGlobalBar>
    </Header>
  );

  const startApp = (): void => {
    let testResolved = false;

    const initCallback = (): void => {
      if (initialized) {
        return;
      }

      // Seeing issue in Safari where calling init doesn't catch or then...
      setTimeout(() => {
        init({appId: 'my-application-unique-id'}).then(() => {
          initialized = true;
        }).catch((error: unknown) => {
          console.error('SDK could not start from quick launch', error);
        })
      }, 3000);
    };

    testConnection().then(() => {
      testResolved = true;
      initCallback();
    }).catch(() => {
      testResolved = true;
      launch();
      initCallback();
    });

    setTimeout(() => {
      // Test never resolved. Launch
      if (!testResolved) {
        launch();
        initCallback();
      }
    }, 2000);
  };

  const currentTabIndex = tabItems.findIndex(item => item.route === location.pathname);

  const tabs = (
    <Tabs selectedIndex={currentTabIndex}>
      <TabList contained>
        {tabItems.map(item => <Tab key={item.route} onClick={() => openPath(item.route)}>{item.name}</Tab>)}
      </TabList>
    </Tabs>
  );

  return (
    <Theme theme="g100" className="aspera-root">
      {header}
      <div className="content-root">
        <div className="content-header">
          <div className="content-header-title">
            <h1>{tabItems[currentTabIndex]?.name || '404'}</h1>
            <div className="content-header-title--actions">
              <Button kind="ghost" type="button" onClick={startApp}>Launch and start</Button>
            </div>
          </div>
          {tabs}
        </div>
        <div className="route-root">
          <Routes>
            {tabItems.map(item => <Route index={item.route === '/'} key={item.route} path={item.route === '/' ? undefined : item.route} element={item.component} />)}
          </Routes>
        </div>
      </div>
    </Theme>
  );
}
