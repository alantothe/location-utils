import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@client/shared/components/layout";
import { Home, AddLocation, ButtonTest } from "@client/features/locations";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddLocation />} />
            <Route path="/button-test" element={<ButtonTest />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
