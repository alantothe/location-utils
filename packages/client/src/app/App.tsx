import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "../shared/components/layout/Navbar";
import { Home, AddLocation } from "../features/locations";
import "../App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddLocation />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
