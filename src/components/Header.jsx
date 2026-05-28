import { Link } from "react-router-dom";
import { getAuthState } from "../auth";

function Header() {
  const authState = getAuthState();

  return (
    <>
      <div className="flex justify-between px-5">
        <h6>Admin Blog CMD</h6>
        <Link to={authState.isAuthenticated ? "/admin" : "/login"}>
          {authState.isAuthenticated ? "Admin" : "Admin Login"}
        </Link>
      </div>
    </>
  );
}

export default Header;
