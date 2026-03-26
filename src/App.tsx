import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LocationPage from './pages/LocationPage';
import SharePage from './pages/SharePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path=":location" element={<LocationPage />} />
        <Route path=":location/:type" element={<LocationPage />} />
        <Route path=":location/:type/:sort" element={<LocationPage />} />
        <Route path="share/:location/:type" element={<SharePage />} />
        <Route path="share/:location/:type/:sort" element={<SharePage />} />
      </Route>
    </Routes>
  );
}
