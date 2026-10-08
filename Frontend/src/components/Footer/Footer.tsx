import { FaTwitter, FaLinkedin, FaInstagram } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { FiPhone } from "react-icons/fi";
import { NavLink } from 'react-router-dom';

function Footer() {
  return (
    <footer className="w-full bg-transparent border-t border-white/10 pt-8 pb-4">
      <h3 className="text-lg font-semibold mb-4 text-center text-black">Connect with me</h3>

      <div className="flex justify-center w-full rounded-lg md:rounded-none pb-4">
        <div className="flex flex-row items-center gap-4 text-gray-700">
          
          <NavLink
            to="https://x.com/AakashBorj86238"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full bg-white/90 hover:bg-white hover:text-black transition"
          >
            <FaTwitter size={20} />
          </NavLink>

          <NavLink
            to="https://linkedin.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full bg-white/90 hover:bg-white hover:text-blue-700 transition"
          >
            <FaLinkedin size={20} />
          </NavLink>

          <NavLink
            to="https://instagram.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full bg-white/90 hover:bg-white hover:text-pink-500 transition"
          >
            <FaInstagram size={20} />
          </NavLink>

          <NavLink
            to="mailto:aakashborji7@gmail.com"
            className="flex items-center gap-2 text-black hover:text-blue-400 transition-colors duration-200"
          >
            <MdEmail /> aakashborji7@gmail.com
          </NavLink>

          <p className="flex items-center gap-2 text-black">
            <FiPhone /> +91 98765 432XX
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;