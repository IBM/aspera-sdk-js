import './App.scss';
import { init, launch, testConnection } from '@ibm-aspera/sdk';
import { Header, HeaderGlobalAction, HeaderGlobalBar, HeaderName, Theme, Tab, TabList, Tabs, Button } from '@carbon/react';
import { LogoGithub, Notification, NotificationOff } from '@carbon/icons-react';
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
  {route: '/', name: 'Home', component: <Home />, hideFromAll: true},
  {route: '/init', name: 'Initialize', component: <Initialize />},
  {route: '/test', name: 'Test', component: <Test />},
  {route: '/installer', name: 'Installing', component: <Installer />},
  {route: '/select-items', name: 'Select items', component: <SelectItems />},
  {route: '/start-transfer', name: 'Start transfer', component: <StartTransfer />},
  {route: '/manage-transfer', name: 'Manage transfers', component: <MonitorTransfers />},
  {route: '/drag-drop', name: 'Drag & drop', component: <DragDrop />},
  {route: '/other', name: 'Other', component: <Other />},
  {route: '/all', name: 'All together', component: <AllTogether />, hideFromAll: true},
];

export default function App() {
  const [disableAlert, setDisableAlert] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  hljs.registerLanguage('javascript', javascript);

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

  const toggleAlert = (): void => {
    const newValue = !disableAlert;

    if (newValue) {
      window.alert = (data) => {
        console.log(data);
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
      </HeaderGlobalBar>
    </Header>
  );

  const startApp = (): void => {
    let testResolved = false;

    const initCallback = (): void => {
      setTimeout(() => {
        init({appId: 'my-application-unique-id'}).catch((error: unknown) => {
          console.error('SDK could not start from quick launch', error);
        })
      }, 1000);
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
