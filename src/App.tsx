import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

// Páginas
import Index from './pages/Index';
import Registro from './pages/Registro';
import Concurso from './pages/Concurso';
import MiPerfil from './pages/MiPerfil';
import Ranking from './pages/Ranking';
import Countdown from './pages/Countdown';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/concurso/:codigo" element={<Concurso />} />
        <Route path="/mi-perfil" element={<MiPerfil />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/countdown" element={<Countdown />} />
        <Route path="*" element={<Index />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </Router>
  );
}

export default App;
