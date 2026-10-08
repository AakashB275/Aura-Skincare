import { useState, useEffect } from "react";

function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(prev => !prev)}
      aria-label="Toggle theme"
      className={`relative w-12 h-6 rounded-full transition-colors duration-300
        ${darkMode ? "bg-blue-500" : "bg-gray-300"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300
          ${darkMode ? "translate-x-6" : "translate-x-0"}`}
      />
    </button>
  );
}

export default ThemeToggle;
