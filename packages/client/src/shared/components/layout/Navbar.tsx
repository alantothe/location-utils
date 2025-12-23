import { Link } from "react-router-dom";
import "./Navbar.css";

export function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Location Manager
        </Link>
        <ul className="navbar-menu">
          <li>
            <Link to="/add">Add Location</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
