import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "@client/shared/components/layout";
import { Home, AddLocation, EditLocation, ButtonTest } from "@client/features/locations";
import { TaxonomyReview } from "@client/features/admin/pages/TaxonomyReview";
import { PayloadSync } from "@client/features/admin/pages/PayloadSync";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/add" element={<AddLocation />} />
            <Route path="/edit/:id" element={<EditLocation />} />
            <Route path="/button-test" element={<ButtonTest />} />
            <Route path="/admin/taxonomy" element={<TaxonomyReview />} />
            <Route path="/admin/payload-sync" element={<PayloadSync />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
