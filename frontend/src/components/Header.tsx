import logo from "/logo.svg";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-linear-to-r from-[#232526] to-[#252628] shadow-[0_1px_4px_rgba(239,68,60,0.1)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Race Engineer Dashboard" className="w-10 h-10" />
          <span className="text-xl font-bold text-white">
            Race Engineer Dashboard
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-8">
          <a
            href="#racegpt"
            className="transition-colors duration-200 font-medium"
          >
            RaceGPT
          </a>
          <a
            href="#data"
            className="transition-colors duration-200 font-medium"
          >
            Data
          </a>
          <a href="#map" className="transition-colors duration-200 font-medium">
            Map
          </a>
          {/* Hamburger Menu */}
          <label className="swap swap-rotate group">
            {/* this hidden checkbox controls the state */}
            <input type="checkbox" />

            {/* hamburger icon */}
            <svg
              className="swap-off fill-current group-hover:fill-(--primary-accent)"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 512 512"
            >
              <path d="M64,384H448V341.33H64Zm0-106.67H448V234.67H64ZM64,128v42.67H448V128Z" />
            </svg>

            {/* close icon */}
            <svg
              className="swap-on fill-current group-hover:fill-(--primary-accent)"
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 512 512"
            >
              <polygon points="400 145.49 366.51 112 256 222.51 145.49 112 112 145.49 222.51 256 112 366.51 145.49 400 256 289.49 366.51 400 400 366.51 289.49 256 400 145.49" />
            </svg>
          </label>
        </nav>
      </div>
    </header>
  );
}
