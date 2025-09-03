import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ReactSVG } from 'react-svg';
import { SketchPicker } from 'react-color';
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

let debounceTimer = null;

// Top Navigation Component
function TopNavigation({ currentPage, setCurrentPage, darkMode, setDarkMode, setShowFeedbackModal, isAdmin, backendUrl, setAllFeedback, setShowFeedbackAdmin }) {
  return (
    <nav className={`w-full px-4 py-3 flex items-center justify-between shadow-md ${darkMode ? 'bg-[#282828]' : 'bg-white'} mb-4`}>
      <div className="flex items-center gap-6">
        <button
          className={`font-semibold text-lg transition-colors ${currentPage === 'icons' ? (darkMode ? 'text-[#d4db50]' : 'text-[#27a5f3]') : (darkMode ? 'text-white' : 'text-gray-700')}`}
          onClick={() => setCurrentPage('icons')}
        >
          Icons
        </button>
        <button
          className={`font-semibold text-lg transition-colors ${currentPage === 'infographics' ? (darkMode ? 'text-[#d4db50]' : 'text-[#27a5f3]') : (darkMode ? 'text-white' : 'text-gray-700')}`}
          onClick={() => setCurrentPage('infographics')}
        >
          Infographics
        </button>
        <button
          className={`font-semibold text-lg transition-colors ${currentPage === 'bcore-branding' ? (darkMode ? 'text-[#d4db50]' : 'text-[#27a5f3]') : (darkMode ? 'text-white' : 'text-gray-700')}`}
          onClick={() => setCurrentPage('bcore-branding')}
        >
          BCORE Branding
        </button>
        <button
          className={`font-semibold text-lg transition-colors ${darkMode ? 'text-white' : 'text-gray-700'} hover:text-blue-500`}
          onClick={() => setShowFeedbackModal(true)}
        >
          Feedback/Icon Request
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-lg transition ${darkMode ? 'bg-[#2E5583] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        {isAdmin && (
          <button
            onClick={async () => {
              try {
                const response = await axios.get(`${backendUrl}/feedback`);
                setAllFeedback(response.data.feedback || []);
                setShowFeedbackAdmin(true);
              } catch (error) {
                console.error('Error loading feedback:', error);
                toast.error("Failed to load feedback");
              }
            }}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${darkMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
            title="View All Feedback (Admin)"
          >
            <span className="text-lg">📊</span>
            <span className="text-sm font-medium">View Feedback</span>
          </button>
        )}
      </div>
    </nav>
  );
}

function App() {
  console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
  
  // Fallback clipboard function for older browsers
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      console.log('SVG copied using fallback method');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  };
  
  // Page navigation state
  const [currentPage, setCurrentPage] = useState("icons"); // "icons" or "infographics"
  
  // Icons page state
  const [icons, setIcons] = useState([]);
  const [flags, setFlags] = useState([]);
  const [folders, setFolders] = useState({});
  const [currentFolder, setCurrentFolder] = useState(null);
  const [allIcons, setAllIcons] = useState([]); // For global search
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [groups, setGroups] = useState([]);
  const [svgUrl, setSvgUrl] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [localPreviewColor, setLocalPreviewColor] = useState("#FF0000");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("icons"); // "icons", "colorful-icons", "single-color", or "flags"
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [flagType, setFlagType] = useState("rectangle"); // "rectangle" or "circle"
  const [groupColors, setGroupColors] = useState({}); // Track colors for each group of current icon
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [colorfulIcons, setColorfulIcons] = useState([]); // For colorful icons global search
  const [colorfulFolders, setColorfulFolders] = useState({}); // Colorful icons folders
  const [singleColorIcons, setSingleColorIcons] = useState([]); // For single color icons
  const [selectedIcons, setSelectedIcons] = useState(new Set());
  const [selectedColorfulIcons, setSelectedColorfulIcons] = useState(new Set());
  const [selectedSingleColorIcons, setSelectedSingleColorIcons] = useState(new Set());
  const [selectedFlags, setSelectedFlags] = useState(new Set());
  const [selectedIconsWithFolders, setSelectedIconsWithFolders] = useState(new Map());
  const [selectedColorfulIconsWithFolders, setSelectedColorfulIconsWithFolders] = useState(new Map());
  const [selectedSingleColorIconsWithFolders, setSelectedSingleColorIconsWithFolders] = useState(new Map());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // Toggle multi-select mode
  const [isGreyscale, setIsGreyscale] = useState(false); // Track if current icon is greyscale
  const [iconListView, setIconListView] = useState("grid"); // 'list' or 'grid'
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState("New Addition");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(""); // Add email field
  const [showFeedbackAdmin, setShowFeedbackAdmin] = useState(false);
  const [allFeedback, setAllFeedback] = useState([]);
  const [isAdmin, setIsAdmin] = useState(import.meta.env.VITE_IS_ADMIN === 'true'); // Only true if you set the env var
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedFeedbackForResponse, setSelectedFeedbackForResponse] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  
  // Infographics state
  const [infographics, setInfographics] = useState([]);
  const [selectedInfographic, setSelectedInfographic] = useState(null);
  const [infographicSearch, setInfographicSearch] = useState("");
  const [infographicCategory, setInfographicCategory] = useState('All');
  const [infographicTheme, setInfographicTheme] = useState('light'); // 'light' or 'bcore'

  // BCORE Branding state
  const [bcoreContent, setBcoreContent] = useState([]);
  const [selectedBcoreItem, setSelectedBcoreItem] = useState(null);
  const [bcoreSearch, setBcoreSearch] = useState("");
  const [bcoreCategory, setBcoreCategory] = useState('All');
  const [currentBcoreFolder, setCurrentBcoreFolder] = useState(null);
  const [bcoreFolders, setBcoreFolders] = useState({});

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  // Debug theme changes
  useEffect(() => {
    console.log('Theme changed to:', infographicTheme);
  }, [infographicTheme]);

  // Trigger redeploy
  useEffect(() => {
    setIsLoading(true);
    axios.get(`${backendUrl}/icons`)
      .then(res => {
        setFolders(res.data.folders);
        
        // Collect all icons from all folders for global search
        const allIconsList = [];
        Object.entries(res.data.folders).forEach(([folderName, icons]) => {
          icons.forEach(iconName => {
            allIconsList.push({ name: iconName, folder: folderName });
          });
        });
        setAllIcons(allIconsList);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
    
    // Fetch colorful icons
    axios.get(`${backendUrl}/colorful-icons`)
      .then(res => {
        setColorfulFolders(res.data.folders);
        
        // Collect all colorful icons from all folders for global search
        const allColorfulIconsList = [];
        Object.entries(res.data.folders).forEach(([folderName, icons]) => {
          icons.forEach(iconName => {
            allColorfulIconsList.push({ name: iconName, folder: folderName });
          });
        });
        setColorfulIcons(allColorfulIconsList);
      })
      .catch(err => {
        console.error(err);
      });
    
    axios.get(`${backendUrl}/flags`)
      .then(res => setFlags(res.data.flags))
      .catch(err => console.error(err));
    
    // Fetch single color icons
    axios.get(`${backendUrl}/single-color`)
      .then(res => setSingleColorIcons(res.data.icons || []))
      .catch(err => console.error(err));
  }, []);

  // Load infographics data
  useEffect(() => {
    axios.get(`${backendUrl}/infographics`)
      .then(res => setInfographics(res.data.infographics || []))
      .catch(err => console.error(err));
  }, [backendUrl]);

      // Load BCORE branding content
  useEffect(() => {
    // For now, we'll use a static list of files from the BCORE_Images_Video folder
    // In a real implementation, you'd want to create a backend endpoint to scan the folder
    const bcoreFiles = [
      // Videos
      { name: '01.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/01.mp4` },
      { name: '02.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/02.mp4` },
      { name: '03.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/03.mp4` },
      { name: '04.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/04.mp4` },
      { name: '05.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/05.mp4` },
      { name: '07.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/07.mp4` },
      { name: '08.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/08.mp4` },
      { name: '09.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/09.mp4` },
      { name: '10.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/10.mp4` },
      { name: '11.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/11.mp4` },
      { name: 'Bcore_circle.mp4', type: 'video', category: 'Videos', path: `${backendUrl}/bcore/Bcore_circle.mp4` },
      // Logos
      { name: 'B_Cross.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Cross.svg` },
      { name: 'B_Filled.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Filled.svg` },
      { name: 'B_Circles.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Circles.svg` },
      { name: 'B_Bcore.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Bcore.svg` },
      { name: 'B_Target_Yellow.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Target_Yellow.svg` },
      { name: 'B_Target_Grey.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Target_Grey.svg` },
      { name: 'B_Target3.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Target3.svg` },
      { name: 'B_Signs_1.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Signs_1.svg` },
      { name: 'B_Percents.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Percents.svg` },
      { name: 'B_Warning.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Warning.svg` },
      { name: 'B_Warning_Orange.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Warning_Orange.svg` },
      { name: 'B_Signs_Orange.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Signs_Orange.svg` },
      { name: 'B_Percents_Orange.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Percents_Orange.svg` },
      { name: 'B_Target2.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Target2.svg` },
      { name: 'B_Target1.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Target1.svg` },
      { name: 'B_Slash.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Slash.svg` },
      { name: 'B_Signs.svg', type: 'logo', category: 'Logos', path: `${backendUrl}/bcore/B_Signs.svg` },
      // New SVG Logos
      { name: 'Bcore_White_Yellow_Main.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_White_Yellow_Main.svg' },
      { name: 'Bcore_White_Target2.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_White_Target2.svg' },
      { name: 'Bcore_Target2.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_Target2.svg' },
      { name: 'B_Tag_Target4.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/B_Tag_Target4.svg' },
      { name: 'B_Tag_Target3.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/B_Tag_Target3.svg' },
      { name: 'B_Tag_Target2.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/B_Tag_Target2.svg' },
      { name: 'B_Tag_Target.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/B_Tag_Target.svg' },
      { name: 'B_Tag_Filled.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/B_Tag_Filled.svg' },
      { name: 'B_Tag.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/B_Tag.svg' },
      { name: 'Bcore_White_Main.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_White_Main.svg' },
      { name: 'Bcore_White_Target.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_White_Target.svg' },
      { name: 'Bcore_Target1.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_Target1.svg' },
      { name: 'Bcore_Filled_O.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_Filled_O.svg' },
      { name: 'Bcore_Yellow_Slash.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_Yellow_Slash.svg' },
      { name: 'Bcore_Main.svg', type: 'logo', category: 'Logos', path: '/Bcore_Images_Video/Logos/Bcore_Main.svg' },
      // Images
      { name: 'B&W CAMERA LENS copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/B&W CAMERA LENS copy.png` },
      { name: 'B&W CONTROL ROOM copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/B&W CONTROL ROOM copy.png` },
      { name: 'B&W MAN HACKER copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/B&W MAN HACKER copy.png` },
      { name: 'B&W MAN STARING AT MONITOR copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/B&W MAN STARING AT MONITOR copy.png` },
      { name: 'B&W MAN WITH CODE copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/B&W MAN WITH CODE copy.png` },
      { name: 'B&W SERVER ROOM copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/B&W SERVER ROOM copy.png` },
      { name: 'b-core glitch 01 copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/b-core glitch 01 copy.png` },
      { name: 'b-core server room 2 copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/b-core server room 2 copy.png` },
      { name: 'b-core tech lines copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/b-core tech lines copy.png` },
      { name: 'Bcore Server Room 2 copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/Bcore Server Room 2 copy.png` },
      { name: 'CIRCUIT BOARD B copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/CIRCUIT BOARD B copy.png` },
      { name: 'CIRCUIT TO ROAD AND CARS OVERHEAD copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/CIRCUIT TO ROAD AND CARS OVERHEAD copy.png` },
      { name: 'CITY TO CIRCUIT BOARD copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/CITY TO CIRCUIT BOARD copy.png` },
      { name: 'COLORIZED MAP.jpg', type: 'image', category: 'Images', path: `${backendUrl}/bcore/COLORIZED MAP.jpg` },
      { name: 'COLORIZED SCHEMATIC copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/COLORIZED SCHEMATIC copy.png` },
      { name: 'dark background 3 2 2 3 copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/dark background 3 2 2 3 copy.png` },
      { name: 'Dark bckgrd Control room ops copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/Dark bckgrd Control room ops copy.png` },
      { name: 'Dark bckgrd nice suit copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/Dark bckgrd nice suit copy.png` },
      { name: 'Dark bckgrd Shadow figure copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/Dark bckgrd Shadow figure copy.png` },
      { name: 'Dark bckgrd shadowy figures copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/Dark bckgrd shadowy figures copy.png` },
      { name: 'DARK COMPUTER ROOM PERSON copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/DARK COMPUTER ROOM PERSON copy.png` },
      { name: 'HUMAN TRACKING SYSTEMS copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/HUMAN TRACKING SYSTEMS copy.png` },
      { name: 'MOTHERBOARD WITH LOGO B copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/MOTHERBOARD WITH LOGO B copy.png` },
      { name: 'REVERSED _B_ copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/REVERSED _B_ copy.png` },
      { name: 'ROAD TO WIRES copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/ROAD TO WIRES copy.png` },
      { name: 'TRACKING DOTS ON FACE copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/TRACKING DOTS ON FACE copy.png` },
      { name: 'WIRE TO ROAD copy.png', type: 'image', category: 'Images', path: `${backendUrl}/bcore/WIRE TO ROAD copy.png` },
      // Branding Assets
      { name: 'Bcore PPT Template New v1.pptx', type: 'template', category: 'Branding', path: `${backendUrl}/bcore/Bcore PPT Template New v1.pptx`, previewPath: `${backendUrl}/bcore/template_preview.PNG` },
      { name: 'Employee LinkedIn cover v1.png', type: 'image', category: 'Branding', path: `${backendUrl}/bcore/Employee LinkedIn cover v1.png` },
      { name: 'Employee LinkedIn cover v2.png', type: 'image', category: 'Branding', path: `${backendUrl}/bcore/Employee LinkedIn cover v2.png` },
      { name: 'Employee LinkedIn cover v3.png', type: 'image', category: 'Branding', path: `${backendUrl}/bcore/Employee LinkedIn cover v3.png` },
      { name: 'Employee LinkedIn cover v4.png', type: 'image', category: 'Branding', path: `${backendUrl}/bcore/Employee LinkedIn cover v4.png` },
      { name: 'Employee LinkedIn cover v5.png', type: 'image', category: 'Branding', path: `${backendUrl}/bcore/Employee LinkedIn cover v5.png` },
      { name: 'Employee LinkedIn cover v6.png', type: 'image', category: 'Branding', path: `${backendUrl}/bcore/Employee LinkedIn cover v6.png` },
    ];
    
    // Organize files by folders and add thumbnail paths for videos
    const videos = bcoreFiles.filter(item => item.category === 'Videos').map(item => ({
      ...item,
      thumbnailPath: `${backendUrl}/bcore/thumbnail/${item.name}`
    }));
    const images = bcoreFiles.filter(item => item.category === 'Images');
    const logos = bcoreFiles.filter(item => item.category === 'Logos');
    const branding = bcoreFiles.filter(item => item.category === 'Branding');
    
    const bcoreFoldersData = {
      'Videos': videos,
      'Images': images,
      'Logos': logos,
      'Branding': branding
    };
    
    setBcoreFolders(bcoreFoldersData);
    setBcoreContent(bcoreFiles);
  }, []);

  // Inject custom CSS for color picker dark mode
  useEffect(() => {
    if (darkMode) {
      const style = document.createElement('style');
      style.id = 'color-picker-dark-mode';
      style.textContent = `
        .sketch-picker input {
          color: black !important;
          background-color: #d1d5db !important;
        }
        .sketch-picker .sketch-picker_input__input {
          color: black !important;
          background-color: #d1d5db !important;
        }
        .sketch-picker .sketch-picker_input__label {
          color: white !important;
        }
        .sketch-picker label {
          color: white !important;
        }
      `;
      document.head.appendChild(style);
    } else {
      const existingStyle = document.getElementById('color-picker-dark-mode');
      if (existingStyle) {
        existingStyle.remove();
      }
    }
  }, [darkMode]);

  // Refresh icons when dark mode changes to show correct default colors
  useEffect(() => {
    // Force refresh of selected icon if one is selected
    if (selectedIcon) {
      const folderPath = currentFolder || "Root";
      const modeSuffix = darkMode ? "-dark" : "-light";
      
      if (activeTab === "icons") {
        if (folderPath === "Root") {
          setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${selectedIcon}.svg?t=${Date.now()}`);
        } else {
          setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`);
        }
      } else if (activeTab === "single-color") {
        setSvgUrl(`${backendUrl}/single-color-files${modeSuffix}/${selectedIcon}.svg?t=${Date.now()}`);
      }
    }
    
    // Force refresh of all icon lists to show correct colors
    if (activeTab === "icons") {
      setIcons(prev => [...prev]); // Force re-render
    } else if (activeTab === "single-color") {
      setSingleColorIcons(prev => [...prev]); // Force re-render
    }
  }, [darkMode, selectedIcon, activeTab, currentFolder, backendUrl]);

  // Extract deduplicated country names from flag files
  const getCountryNames = () => {
    const countryNames = new Set();
    
    flags.forEach(flag => {
      // Remove "_circle" suffix and ".svg" extension
      let countryName = flag.replace('_circle.svg', '').replace('.svg', '');
      countryNames.add(countryName);
    });
    
    return Array.from(countryNames).sort();
  };

  // Get flag filename for a country and type
  const getFlagFilename = (countryName, type) => {
    if (type === "circle") {
      return `${countryName}_circle.svg`;
    } else {
      return `${countryName}.svg`;
    }
  };

  // Check if a flag type exists for a country
  const flagTypeExists = (countryName, type) => {
    const filename = getFlagFilename(countryName, type);
    return flags.includes(filename);
  };

  const loadGroups = (itemName) => {
    console.log('loadGroups called with:', itemName);
    console.log('Current activeTab:', activeTab);
    console.log('Current currentFolder:', currentFolder);
    
    if (activeTab === "flags") {
      // For flags, set the selected country
      setSelectedCountry(itemName);
      setSelectedIcon(null);
      setSelectedGroup(null);
      setSvgUrl("");
      setGroups([]);
      setGroupColors({}); // Reset group colors for flags
      
      // Default to rectangle if available, otherwise circle
      if (flagTypeExists(itemName, "rectangle")) {
        setFlagType("rectangle");
        const filename = getFlagFilename(itemName, "rectangle");
        setSvgUrl(`${backendUrl}/flags/${filename}`);
      } else if (flagTypeExists(itemName, "circle")) {
        setFlagType("circle");
        const filename = getFlagFilename(itemName, "circle");
        setSvgUrl(`${backendUrl}/flags/${filename}`);
      }
    } else {
      // For icons, colorful icons, and single color icons, use folder-aware logic
      console.log('Setting selectedIcon to:', itemName);
      setSelectedIcon(itemName);
      const folderPath = currentFolder || "Root";
      console.log('Using folderPath:', folderPath);
      
      let svgUrlToSet;
      if (activeTab === "colorful-icons") {
        // Use colorful icons path
        if (folderPath === "Root") {
          svgUrlToSet = `${backendUrl}/colorful-icons/${itemName}.svg`;
        } else {
          svgUrlToSet = `${backendUrl}/colorful-icons/${folderPath}/${itemName}.svg`;
        }
      } else if (activeTab === "single-color") {
        // Use single color path - check for both PNG and SVG with mode-specific URLs
        const modeSuffix = darkMode ? "-dark" : "-light";
        const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${itemName}.png`;
        const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${itemName}.svg`;
        
        // Try to load SVG first, fallback to PNG
        fetch(svgUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              setSvgUrl(svgUrl);
            } else {
              setSvgUrl(pngUrl);
            }
          })
          .catch(() => {
            setSvgUrl(pngUrl);
          });
        return; // Exit early since we're handling the URL setting asynchronously
      } else {
        // Use regular icons path with mode-specific URLs
        const modeSuffix = darkMode ? "-dark" : "-light";
        if (folderPath === "Root") {
          svgUrlToSet = `${backendUrl}/static-icons${modeSuffix}/${itemName}.svg`;
        } else {
          svgUrlToSet = `${backendUrl}/static-icons${modeSuffix}/${folderPath}/${itemName}.svg`;
        }
      }
      console.log('loadGroups setting SVG URL to:', svgUrlToSet);
      setSvgUrl(svgUrlToSet);
      
      setSelectedGroup(null);
      setGroupColors({}); // Reset group colors for new icon
      
      // Only load groups for regular icons, not for colorful icons, single color icons, or flags
      if (activeTab === "icons") {
        console.log('Loading groups for icon:', itemName);
        axios.get(`${backendUrl}/groups/icon/${folderPath}/${itemName}.svg`) // Append .svg extension
          .then(res => {
            console.log('Groups loaded:', res.data.groups);
            setGroups(res.data.groups);
          })
          .catch(err => {
            console.error('Error loading groups:', err);
          });
      } else {
        setGroups([]); // No groups for colorful icons, single color icons, or flags
      }
    }
  };

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    
    // If Grey group is selected, set default color based on current mode
    if (group.toLowerCase().includes("grey")) {
      const defaultColor = darkMode ? "#D3D3D3" : "#282828";
      setCurrentColor(defaultColor);
      setLocalPreviewColor(defaultColor);
      
      // Apply the default color to the Grey group immediately
      if (selectedIcon) {
        setLoading(true);
        const folderPath = currentFolder || "Root";
        axios.post(`${backendUrl}/update_color`, {
          icon_name: selectedIcon + ".svg",
          group_id: group,
          color: defaultColor,
          type: activeTab,
          folder: folderPath,
          mode: darkMode ? "dark" : "light"
        }, {
          headers: { 'Content-Type': 'application/json' }
        }).then(res => {
          // Update SVG URL with folder path and mode
          const modeSuffix = darkMode ? "-dark" : "-light";
          if (folderPath === "Root") {
            setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${selectedIcon}.svg?t=${Date.now()}`);
          } else {
            setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`);
          }
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
        });
      }
    } else {
      setLocalPreviewColor(currentColor);
    }
  };

  const applyColorChange = useCallback((colorToApply) => {
    if (activeTab === "flags") {
      // For flags, apply color to the entire SVG
      setLoading(true);
      axios.post(`${backendUrl}/update_color`, {
        icon_name: selectedIcon,
        group_id: "entire_flag", // Special identifier for entire flag
        color: colorToApply,
        type: activeTab,
        mode: darkMode ? "dark" : "light"
      }, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        const baseUrl = activeTab === "icons" ? `${backendUrl}/static` : `${backendUrl}/flags`;
        setSvgUrl(`${baseUrl}/${selectedIcon}?t=${Date.now()}`);
        setLoading(false);
        toast.success("Color updated");
      }).catch(err => {
        console.error(err);
        setLoading(false);
        toast.error("Failed to update color.");
      });
    } else if (activeTab === "single-color") {
      // For single color icons, apply color to the entire icon
      setLoading(true);
      axios.post(`${backendUrl}/single-color/update`, {
        icon_name: selectedIcon,
        color: colorToApply,
        mode: darkMode ? "dark" : "light"
      }, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        // Refresh the icon to show the new color with mode-specific URLs
        const modeSuffix = darkMode ? "-dark" : "-light";
        const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${selectedIcon}.png`;
        const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${selectedIcon}.svg`;
        
        fetch(svgUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              setSvgUrl(`${svgUrl}?t=${Date.now()}`);
            } else {
              setSvgUrl(`${pngUrl}?t=${Date.now()}`);
            }
          })
          .catch(() => {
            setSvgUrl(`${pngUrl}?t=${Date.now()}`);
          });
        
        setLoading(false);
        toast.success("Color updated");
      }).catch(err => {
        console.error(err);
        setLoading(false);
        toast.error("Failed to update color.");
      });
    } else {
      // For icons, apply color to specific group
      if (!selectedGroup) return;
      setLoading(true);
      
      // Save the color to groupColors state
      setGroupColors(prev => ({
        ...prev,
        [selectedGroup]: colorToApply
      }));
      
      const folderPath = currentFolder || "Root";
      axios.post(`${backendUrl}/update_color`, {
        icon_name: selectedIcon + ".svg", // Append .svg extension for icons
        group_id: selectedGroup,
        color: colorToApply,
        type: activeTab,
        folder: folderPath,
        mode: darkMode ? "dark" : "light"
      }, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        // Update SVG URL with folder path and mode
        const modeSuffix = darkMode ? "-dark" : "-light";
        if (folderPath === "Root") {
          setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${selectedIcon}.svg?t=${Date.now()}`);
        } else {
          setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`);
        }
        setLoading(false);
        toast.success("Color updated");
      }).catch(err => {
        console.error(err);
        setLoading(false);
        toast.error("Failed to update color.");
      });
    }
  }, [selectedIcon, selectedGroup, activeTab, currentFolder]);

  const handleColorChange = (color) => {
    const hex = color.hex;
    setCurrentColor(hex);
    setLocalPreviewColor(hex);

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      applyColorChange(hex);
    }, 500); // still debounce backend call
  };

  const exportSvg = async () => {
    try {
      // Determine the icon name and type
      let iconName, type, folder;
      if (activeTab === "flags" && selectedCountry) {
        iconName = getFlagFilename(selectedCountry, flagType);
        type = "flag";
      } else if (activeTab === "single-color") {
        iconName = selectedIcon + ".svg"; // For single color icons
        type = "icon";
        folder = "SingleColor";
      } else if (activeTab === "colorful-icons") {
        iconName = selectedIcon + ".svg"; // For colorful icons
        type = "colorful-icon";
        folder = currentFolder || "Root";
      } else {
        iconName = selectedIcon + ".svg"; // Append .svg extension for icons
        type = "icon";
        folder = currentFolder || "Root";
      }

      // Call the backend to export SVG
      const requestData = {
        icon_name: iconName,
        type: type,
        mode: darkMode ? "dark" : "light"
      };
      
      if (type === "icon" || type === "colorful-icon") {
        requestData.folder = folder;
      }
      
      console.log('Exporting SVG with request data:', requestData);
      
      const response = await axios.post(`${backendUrl}/download-svg`, requestData, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = iconName;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("SVG downloaded successfully!");
    } catch (error) {
      console.error('Error downloading SVG:', error);
      toast.error("Failed to download SVG");
    }
  }

  const exportPng = async () => {
    try {
      // Determine the icon name and type
      let iconName, type, folder;
      if (activeTab === "flags" && selectedCountry) {
        iconName = getFlagFilename(selectedCountry, flagType);
        type = "flag";
      } else if (activeTab === "single-color") {
        iconName = selectedIcon + ".svg"; // For single color icons
        type = "icon";
        folder = "SingleColor";
      } else {
        iconName = selectedIcon + ".svg"; // Append .svg extension for icons
        type = "icon";
        folder = currentFolder || "Root";
      }

      // Call the backend to convert and download PNG
      const requestData = {
        icon_name: iconName,
        type: type,
        mode: darkMode ? "dark" : "light"
      };
      
      if (type === "icon") {
        requestData.folder = folder;
      }
      
      const response = await axios.post(`${backendUrl}/export-png`, requestData, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = iconName.replace('.svg', '.png');
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("PNG downloaded successfully!");
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast.error("Failed to download PNG");
    }
  }

  const exportMultipleSvg = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let selectedItems = [];
      if (activeTab === "icons") {
        selectedItems = Array.from(selectedIcons || []);
      } else if (activeTab === "colorful-icons") {
        selectedItems = Array.from(selectedColorfulIcons || []);
      } else if (activeTab === "single-color") {
        selectedItems = Array.from(selectedSingleColorIcons || []);
      } else if (activeTab === "flags") {
        selectedItems = Array.from(selectedFlags || []);
      }
      
      if (selectedItems.length === 0) {
        toast.error("No items selected for export");
        return;
      }
      
      const folderPath = currentFolder || "Root";
      
      // Download each SVG individually
      for (const itemName of selectedItems) {
        try {
          let svgUrl;
          if (activeTab === "flags") {
            svgUrl = `${backendUrl}/flags/${getFlagFilename(itemName, flagType)}`;
          } else if (activeTab === "colorful-icons") {
            svgUrl = folderPath === "Root" 
              ? `${backendUrl}/colorful-icons/${itemName}.svg`
              : `${backendUrl}/colorful-icons/${folderPath}/${itemName}.svg`;
          } else if (activeTab === "single-color") {
            const modeSuffix = darkMode ? "-dark" : "-light";
            svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${itemName}.svg`;
          } else {
            const modeSuffix = darkMode ? "-dark" : "-light";
            svgUrl = folderPath === "Root" 
              ? `${backendUrl}/static-icons${modeSuffix}/${itemName}.svg`
              : `${backendUrl}/static-icons${modeSuffix}/${folderPath}/${itemName}.svg`;
          }
          
          const response = await fetch(svgUrl);
          const svgContent = await response.text();
          
          // Create a blob with the SVG content
          const blob = new Blob([svgContent], { type: 'image/svg+xml' });
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${itemName}.svg`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          // Small delay to prevent browser from blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to download SVG for ${itemName}:`, error);
        }
      }
      
      toast.success(`${selectedItems.length} SVGs downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading multiple SVGs:', error);
      toast.error("Failed to download SVGs");
    }
  };

  const exportMultiplePng = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let selectedItems = [];
      if (activeTab === "icons") {
        selectedItems = Array.from(selectedIcons || []);
      } else if (activeTab === "colorful-icons") {
        selectedItems = Array.from(selectedColorfulIcons || []);
      } else if (activeTab === "single-color") {
        selectedItems = Array.from(selectedSingleColorIcons || []);
      } else if (activeTab === "flags") {
        selectedItems = Array.from(selectedFlags || []);
      }
      
      if (selectedItems.length === 0) {
        toast.error("No items selected for export");
        return;
      }
      
      const folderPath = currentFolder || "Root";
      
      // Download each PNG individually
      for (const itemName of selectedItems) {
        try {
          let iconName, type;
          if (activeTab === "flags") {
            iconName = getFlagFilename(itemName, flagType);
            type = "flag";
          } else if (activeTab === "single-color") {
            iconName = itemName + ".svg";
            type = "single-color";
          } else {
            iconName = itemName + ".svg";
            type = "icon";
          }
          
          const requestData = {
            icon_name: iconName,
            type: type,
            mode: darkMode ? "dark" : "light"
          };
          
          if (type === "icon") {
            requestData.folder = folderPath;
          }
          
          const response = await axios.post(`${backendUrl}/export-png`, requestData, {
            responseType: 'blob'
          });
          
          // Create download link
          const url = window.URL.createObjectURL(response.data);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${itemName}.png`;
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          
          // Clean up
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          // Small delay to prevent browser from blocking multiple downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to download PNG for ${itemName}:`, error);
        }
      }
      
      toast.success(`${selectedItems.length} PNGs downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading multiple PNGs:', error);
      toast.error("Failed to download PNGs");
    }
  };

  const exportMultipleZip = async (format = "svg") => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let selectedItems = [];
      if (activeTab === "icons") {
        selectedItems = Array.from(selectedIcons || []);
      } else if (activeTab === "colorful-icons") {
        selectedItems = Array.from(selectedColorfulIcons || []);
      } else if (activeTab === "single-color") {
        selectedItems = Array.from(selectedSingleColorIcons || []);
      } else if (activeTab === "flags") {
        selectedItems = Array.from(selectedFlags || []);
      }
      
      if (selectedItems.length === 0) {
        toast.error("No items selected for export");
        return;
      }
      
      const folderPath = currentFolder || "Root";
      
      // Determine the type for the backend
      let type;
      if (activeTab === "flags") {
        type = "flag";
      } else if (activeTab === "colorful-icons") {
        type = "colorful-icon";
      } else if (activeTab === "single-color") {
        type = "single-color";
      } else {
        type = "icon";
      }
      
      const requestData = {
        items: selectedItems,
        type: type,
        folder: folderPath,
        format: format,
        mode: darkMode ? "dark" : "light"
      };
      
      const response = await axios.post(`${backendUrl}/export-zip`, requestData, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTab}_${format}_${selectedItems.length}_icons.zip`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`ZIP file with ${selectedItems.length} ${format.toUpperCase()} files downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      toast.error("Failed to download ZIP file");
    }
  };

  const resetColor = async () => {
    if (activeTab === "flags") {
      // For flags, reset entire flag
      try {
        setLoading(true);
        const defaultColor = "#282828"; // Bcore Grey
        
        await axios.post(`${backendUrl}/update_color`, {
          icon_name: selectedIcon,
          group_id: "entire_flag",
          color: defaultColor,
          type: activeTab,
          mode: darkMode ? "dark" : "light"
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const baseUrl = activeTab === "icons" ? `${backendUrl}/static` : `${backendUrl}/flags`;
        setSvgUrl(`${baseUrl}/${selectedIcon}?t=${Date.now()}`);
        setCurrentColor(defaultColor);
        setLocalPreviewColor(defaultColor);
        setLoading(false);
        toast.success("Color reset to default");
      } catch (error) {
        console.error('Error resetting color:', error);
        setLoading(false);
        toast.error("Failed to reset color");
      }
    } else if (activeTab === "single-color") {
      // For single color icons, revert to original color
      try {
        setLoading(true);
        
        const response = await axios.post(`${backendUrl}/single-color/revert`, {
          icon_name: selectedIcon,
          mode: darkMode ? "dark" : "light"
        });
        
        if (response.data.status === "Reverted to original color") {
          // Refresh the SVG to show the original color with mode-specific URLs
          const modeSuffix = darkMode ? "-dark" : "-light";
          const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${selectedIcon}.png?t=${Date.now()}`;
          const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${selectedIcon}.svg?t=${Date.now()}`;
          
          fetch(svgUrl, { method: 'HEAD' })
            .then(response => {
              if (response.ok) {
                setSvgUrl(svgUrl);
              } else {
                setSvgUrl(pngUrl);
              }
            })
            .catch(() => {
              setSvgUrl(pngUrl);
            });
          
          setLoading(false);
          toast.success("Icon reverted to original color!");
        } else {
          toast.error("Failed to revert to original color");
          setLoading(false);
        }
      } catch (error) {
        console.error('Error reverting single color icon:', error);
        toast.error("Failed to revert to original color");
        setLoading(false);
      }
    } else {
      // For icons, reset specific group to its original color
      if (!selectedGroup) return;
      
      try {
        setLoading(true);
        
        // Determine the original color based on group name and current mode
        let originalColor;
        if (selectedGroup.toLowerCase().includes("color")) {
          originalColor = "#00ABF6"; // Blue for Color group
        } else if (selectedGroup.toLowerCase().includes("grey")) {
          originalColor = darkMode ? "#D3D3D3" : "#282828"; // Light grey for dark mode, dark grey for light mode
        } else {
          originalColor = "#282828"; // Default grey for other groups
        }
        
        // Remove the color from groupColors state
        setGroupColors(prev => {
          const newColors = { ...prev };
          delete newColors[selectedGroup];
          return newColors;
        });
        
        const folderPath = currentFolder || "Root";
        await axios.post(`${backendUrl}/update_color`, {
          icon_name: selectedIcon + ".svg", // Append .svg extension for icons
          group_id: selectedGroup,
          color: originalColor,
          type: activeTab,
          folder: folderPath
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Update SVG URL with folder path and mode
        const modeSuffix = darkMode ? "-dark" : "-light";
        if (folderPath === "Root") {
          setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${selectedIcon}.svg?t=${Date.now()}`);
        } else {
          setSvgUrl(`${backendUrl}/static-icons${modeSuffix}/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`);
        }
        setCurrentColor(originalColor);
        setLocalPreviewColor(originalColor);
        setLoading(false);
        toast.success(`Color reset to original (${originalColor})`);
      } catch (error) {
        console.error('Error resetting color:', error);
        setLoading(false);
        toast.error("Failed to reset color");
      }
    }
  };

  const selectCompanyColor = (color) => {
    setCurrentColor(color);
    setLocalPreviewColor(color);
    
    // In multi-select mode for single color icons, apply to all selected icons
    if (isMultiSelectMode && activeTab === "single-color" && selectedSingleColorIcons && selectedSingleColorIcons.size > 0) {
      applyColorToMultipleSingleColorIcons(color);
    } else {
      // Apply to single selected icon
      applyColorChange(color);
    }
  };

  // Company colors - customize these with your actual brand colors
  const companyColors = [
    { name: "Grey", hex: "#282828" },
    { name: "Yellow", hex: "#D6E101" },
    { name: "Orange", hex: "#FF931D" },
    { name: "Black", hex: "#000000" },
    { name: "Blue", hex: "#00ABF6" },
    { name: "Red", hex: "#FE2001" }

  ];

  // Filter items based on search term and active tab
  const filteredItems = (() => {
    console.log('Filtering items:', { activeTab, searchTerm, currentFolder, allIconsLength: allIcons.length, colorfulIconsLength: colorfulIcons.length });
    
    const result = activeTab === "icons" 
      ? (searchTerm 
          ? (currentFolder 
              ? icons.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase())).sort()
              : allIcons.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
            )
          : currentFolder 
            ? icons.sort()
            : []
        )
      : activeTab === "colorful-icons"
        ? (searchTerm 
            ? (currentFolder 
                ? icons.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase())).sort()
                : colorfulIcons.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
              )
            : currentFolder 
              ? icons.sort()
              : []
          )
        : activeTab === "single-color"
          ? (searchTerm 
              ? singleColorIcons.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase())).sort()
              : singleColorIcons.sort()
            )
          : activeTab === "flags"
            ? (searchTerm 
                ? getCountryNames().filter(country => country.toLowerCase().includes(searchTerm.toLowerCase())).sort()
                : getCountryNames().sort()
              )
            : [];
    
    console.log('Filtered items result:', result);
    return result;
  })();

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedIcon(null);
    setSelectedCountry(null);
    setSelectedGroup(null);
    setSvgUrl("");
    setGroups([]);
    setSearchTerm("");
    setFlagType("rectangle");
    setGroupColors({}); // Reset group colors when switching tabs
    setCurrentFolder(null); // Reset current folder when switching tabs
    setCurrentBcoreFolder(null); // Reset BCORE folder when switching tabs
    
    // Clear multi-select selections when switching tabs
    setSelectedIcons(new Set());
    setSelectedColorfulIcons(new Set());
    setSelectedSingleColorIcons(new Set());
    setSelectedFlags(new Set());
    
    // Load appropriate icons based on tab
    if (tab === "colorful-icons") {
      setIcons([]); // Will be set when folder is selected
    }
  };

  // Handle flag type change (rectangle/circle)
  const handleFlagTypeChange = (type) => {
    if (!selectedCountry) return;
    
    if (flagTypeExists(selectedCountry, type)) {
      setFlagType(type);
      const filename = getFlagFilename(selectedCountry, type);
      setSvgUrl(`${backendUrl}/flags/${filename}`);
    }
  };

  // Handle flag color change
  const handleFlagColorChange = () => {
    setSelectedGroup("entire_flag"); // Set a special group for flags
    setLocalPreviewColor(currentColor);
  };

  const loadIconsFromFolder = (folderName) => {
    setCurrentFolder(folderName);
    
    // Use appropriate folder data based on active tab
    if (activeTab === "colorful-icons") {
      setIcons(colorfulFolders[folderName] || []);
    } else {
      setIcons(folders[folderName]);
    }
    
    setSelectedIcon(null);
    setSelectedGroup(null);
    setSvgUrl("");
    setGroups([]);
    setGroupColors({});
    setSearchTerm(""); // Clear search when entering a folder
  };

  const loadBcoreFromFolder = (folderName) => {
    setCurrentBcoreFolder(folderName);
    setBcoreContent(bcoreFolders[folderName] || []);
    setSelectedBcoreItem(null);
    setBcoreSearch(""); // Clear search when entering a folder
  };

  const loadGroupsWithFolder = (itemName, folder) => {
    console.log('loadGroupsWithFolder called with:', itemName, folder);
    console.log('Current activeTab:', activeTab);
    
    if (activeTab === "flags") {
      // For flags, set the selected country
      setSelectedCountry(itemName);
      setSelectedIcon(null);
      setSelectedGroup(null);
      setSvgUrl("");
      setGroups([]);
      setGroupColors({}); // Reset group colors for flags
      
      // Default to rectangle if available, otherwise circle
      if (flagTypeExists(itemName, "rectangle")) {
        setFlagType("rectangle");
        const filename = getFlagFilename(itemName, "rectangle");
        setSvgUrl(`${backendUrl}/flags/${filename}`);
      } else if (flagTypeExists(itemName, "circle")) {
        setFlagType("circle");
        const filename = getFlagFilename(itemName, "circle");
        setSvgUrl(`${backendUrl}/flags/${filename}`);
      }
    } else {
      // For icons and colorful icons, use folder-aware logic
      console.log('Setting selectedIcon to:', itemName);
      setSelectedIcon(itemName);
      const folderPath = folder || "Root";
      console.log('Using folderPath:', folderPath);
      
      let svgUrlToSet;
      if (activeTab === "colorful-icons") {
        // Use colorful icons path
        if (folderPath === "Root") {
          svgUrlToSet = `${backendUrl}/colorful-icons/${itemName}.svg`;
        } else {
          svgUrlToSet = `${backendUrl}/colorful-icons/${folderPath}/${itemName}.svg`;
        }
      } else {
        // Use regular icons path with mode-specific URLs
        const modeSuffix = darkMode ? "-dark" : "-light";
        if (folderPath === "Root") {
          svgUrlToSet = `${backendUrl}/static-icons${modeSuffix}/${itemName}.svg`;
        } else {
          svgUrlToSet = `${backendUrl}/static-icons${modeSuffix}/${folderPath}/${itemName}.svg`;
        }
      }
      console.log('loadGroupsWithFolder setting SVG URL to:', svgUrlToSet);
      setSvgUrl(svgUrlToSet);
      
      setSelectedGroup(null);
      setGroupColors({}); // Reset group colors for new icon
      
      // Only load groups for regular icons, not for colorful icons or flags
      if (activeTab === "icons") {
        console.log('Loading groups for icon:', itemName);
        axios.get(`${backendUrl}/groups/icon/${folderPath}/${itemName}.svg`) // Append .svg extension
          .then(res => {
            console.log('Groups loaded:', res.data.groups);
            setGroups(res.data.groups);
          })
          .catch(err => {
            console.error('Error loading groups:', err);
          });
      } else {
        setGroups([]); // No groups for colorful icons or flags
      }
    }
  };

  const convertToGreyscale = async () => {
    if (!selectedIcon || activeTab !== "colorful-icons") return;
    
    try {
      setLoading(true);
      const folderPath = currentFolder || "Root";
      
      const response = await axios.post(`${backendUrl}/greyscale`, {
        icon_name: selectedIcon,
        folder: folderPath
      });
      
      if (response.data.status === "Converted to greyscale") {
        // Refresh the SVG to show the greyscale version
        const svgUrlToSet = folderPath === "Root" 
          ? `${backendUrl}/colorful-icons/${selectedIcon}.svg?t=${Date.now()}`
          : `${backendUrl}/colorful-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`;
        
        setSvgUrl(svgUrlToSet);
        setIsGreyscale(true); // Set greyscale state to true
        toast.success("Icon converted to greyscale!");
      } else {
        toast.error("Failed to convert to greyscale");
      }
    } catch (error) {
      console.error('Error converting to greyscale:', error);
      toast.error("Failed to convert to greyscale");
    } finally {
      setLoading(false);
    }
  };

  const revertToColor = async () => {
    if (!selectedIcon || activeTab !== "colorful-icons") return;
    
    try {
      setLoading(true);
      const folderPath = currentFolder || "Root";
      
      const response = await axios.post(`${backendUrl}/revert`, {
        icon_name: selectedIcon,
        folder: folderPath
      });
      
      if (response.data.status === "Reverted to original colors") {
        // Refresh the SVG to show the original colorful version
        const svgUrlToSet = folderPath === "Root" 
          ? `${backendUrl}/colorful-icons/${selectedIcon}.svg?t=${Date.now()}`
          : `${backendUrl}/colorful-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`;
        
        setSvgUrl(svgUrlToSet);
        setIsGreyscale(false); // Set greyscale state to false
        toast.success("Icon reverted to original colors!");
      } else {
        toast.error("Failed to revert to original colors");
      }
    } catch (error) {
      console.error('Error reverting to color:', error);
      toast.error("Failed to revert to original colors");
    } finally {
      setLoading(false);
    }
  };

  const enableGreyscaleMode = () => {
    setIsGreyscale(true);
    toast.info("Greyscale mode enabled - you can now revert to color!");
  };

  // Multi-select functions
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    // Clear selections when exiting multi-select mode
    if (isMultiSelectMode) {
      setSelectedIcons(new Set());
      setSelectedColorfulIcons(new Set());
      setSelectedSingleColorIcons(new Set());
      setSelectedFlags(new Set());
      setSelectedIconsWithFolders(new Map());
      setSelectedColorfulIconsWithFolders(new Map());
      setSelectedSingleColorIconsWithFolders(new Map());
      
      // Clear preview when exiting multi-select mode
      if (activeTab === "single-color") {
        setSelectedIcon(null);
        setSvgUrl("");
      }
    }
  };

  const toggleIconSelection = (iconName) => {
    try {
      if (!isMultiSelectMode) return;
      
      const folderPath = currentFolder || "Root";
      
      if (activeTab === "icons") {
        setSelectedIcons(prev => {
          const newSet = new Set(prev || []);
          if (newSet.has(iconName)) {
            newSet.delete(iconName);
          } else {
            newSet.add(iconName);
          }
          return newSet;
        });
        
        setSelectedIconsWithFolders(prev => {
          const newMap = new Map(prev || []);
          if (newMap.has(iconName)) {
            newMap.delete(iconName);
          } else {
            newMap.set(iconName, folderPath);
          }
          return newMap;
        });
      } else if (activeTab === "colorful-icons") {
        setSelectedColorfulIcons(prev => {
          const newSet = new Set(prev || []);
          if (newSet.has(iconName)) {
            newSet.delete(iconName);
          } else {
            newSet.add(iconName);
          }
          return newSet;
        });
        
        setSelectedColorfulIconsWithFolders(prev => {
          const newMap = new Map(prev || []);
          if (newMap.has(iconName)) {
            newMap.delete(iconName);
          } else {
            newMap.set(iconName, folderPath);
          }
          return newMap;
        });
      } else if (activeTab === "single-color") {
        setSelectedSingleColorIcons(prev => {
          const newSet = new Set(prev || []);
          if (newSet.has(iconName)) {
            newSet.delete(iconName);
          } else {
            newSet.add(iconName);
          }
          return newSet;
        });
        
        setSelectedSingleColorIconsWithFolders(prev => {
          const newMap = new Map(prev || []);
          if (newMap.has(iconName)) {
            newMap.delete(iconName);
          } else {
            newMap.set(iconName, folderPath);
          }
          return newMap;
        });
        
        // Set preview icon to the first selected icon
        setSelectedSingleColorIcons(prev => {
          if (prev && prev.size > 0) {
            const firstIcon = Array.from(prev)[0];
            setSelectedIcon(firstIcon);
            setSelectedGroup("entire_icon");
            
            // Set the SVG URL for preview with mode-specific URLs
            const modeSuffix = darkMode ? "-dark" : "-light";
            const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${firstIcon}.png`;
            const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${firstIcon}.svg`;
            
            fetch(svgUrl, { method: 'HEAD' })
              .then(response => {
                if (response.ok) {
                  setSvgUrl(svgUrl);
                } else {
                  setSvgUrl(pngUrl);
                }
              })
              .catch(() => {
                setSvgUrl(pngUrl);
              });
          } else {
            // No icons selected, clear preview
            setSelectedIcon(null);
            setSvgUrl("");
          }
          return prev;
        });
      } else if (activeTab === "flags") {
        setSelectedFlags(prev => {
          const newSet = new Set(prev || []);
          if (newSet.has(iconName)) {
            newSet.delete(iconName);
          } else {
            newSet.add(iconName);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error in toggleIconSelection:', error);
    }
  };

  const getSelectedCount = () => {
    try {
      if (activeTab === "icons") return selectedIcons ? selectedIcons.size : 0;
      if (activeTab === "colorful-icons") return selectedColorfulIcons ? selectedColorfulIcons.size : 0;
      if (activeTab === "single-color") return selectedSingleColorIcons ? selectedSingleColorIcons.size : 0;
      if (activeTab === "flags") return selectedFlags ? selectedFlags.size : 0;
      return 0;
    } catch (error) {
      console.error('Error in getSelectedCount:', error);
      return 0;
    }
  };

  const applyColorToMultipleIcons = async (groupName, color) => {
    if (activeTab !== "icons") return;
    
    const selectedIconList = Array.from(selectedIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      
      // Apply color to all selected icons using their stored folder information
      const promises = selectedIconList.map(iconName => {
        const folderPath = selectedIconsWithFolders.get(iconName) || "Root";
        return axios.post(`${backendUrl}/update_color`, {
          icon_name: iconName + ".svg",
          group_id: groupName,
          color: color,
          type: "icon",
          folder: folderPath
        });
      });
      
      await Promise.all(promises);
      
      // Force refresh of the preview by updating the selectedIcons set
      setSelectedIcons(prev => new Set(prev));
      
      toast.success(`Color applied to ${selectedIconList.length} icons!`);
    } catch (error) {
      console.error('Error applying color to multiple icons:', error);
      toast.error("Failed to apply color to some icons");
    } finally {
      setLoading(false);
    }
  };

  const applyColorToMultipleSingleColorIcons = async (color) => {
    if (activeTab !== "single-color") return;
    
    const selectedIconList = Array.from(selectedSingleColorIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      
      // Apply color to all selected single color icons
      const promises = selectedIconList.map(iconName => {
        return axios.post(`${backendUrl}/single-color/update`, {
          icon_name: iconName + ".svg",
          color: color
        });
      });
      
      await Promise.all(promises);
      
      // Force refresh of the preview by updating the selectedSingleColorIcons set
      setSelectedSingleColorIcons(prev => new Set(prev));
      
      toast.success(`Color applied to ${selectedIconList.length} single color icons!`);
    } catch (error) {
      console.error('Error applying color to multiple single color icons:', error);
      toast.error("Failed to apply color to some single color icons");
    } finally {
      setLoading(false);
    }
  };

  const convertMultipleToGreyscale = async () => {
    if (activeTab !== "colorful-icons") return;
    
    const selectedIconList = Array.from(selectedColorfulIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      
      // Convert all selected icons to greyscale using their stored folder information
      const promises = selectedIconList.map(iconName => {
        const folderPath = selectedColorfulIconsWithFolders.get(iconName) || "Root";
        return axios.post(`${backendUrl}/greyscale`, {
          icon_name: iconName,
          folder: folderPath
        });
      });
      
      await Promise.all(promises);
      
      // Force refresh of the preview by updating the selectedColorfulIcons set
      setSelectedColorfulIcons(prev => new Set(prev));
      
      toast.success(`Converted ${selectedIconList.length} icons to greyscale!`);
    } catch (error) {
      console.error('Error converting multiple icons to greyscale:', error);
      toast.error("Failed to convert some icons to greyscale");
    } finally {
      setLoading(false);
    }
  };

  const revertMultipleToColor = async () => {
    if (activeTab !== "colorful-icons") return;
    
    const selectedIconList = Array.from(selectedColorfulIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      
      // Revert all selected icons to original colors using their stored folder information
      const promises = selectedIconList.map(iconName => {
        const folderPath = selectedColorfulIconsWithFolders.get(iconName) || "Root";
        return axios.post(`${backendUrl}/revert`, {
          icon_name: iconName,
          folder: folderPath
        });
      });
      
      await Promise.all(promises);
      
      // Force refresh of the preview by updating the selectedColorfulIcons set
      setSelectedColorfulIcons(prev => new Set(prev));
      
      toast.success(`Reverted ${selectedIconList.length} icons to original colors!`);
    } catch (error) {
      console.error('Error reverting multiple icons to color:', error);
      toast.error("Failed to revert some icons to original colors");
    } finally {
      setLoading(false);
    }
  };

  const resetMultipleIconsToOriginal = async () => {
    if (activeTab !== "icons") return;
    
    const selectedIconList = Array.from(selectedIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      
      // Reset all selected icons to original colors using their stored folder information
      const promises = [];
      
      for (const iconName of selectedIconList) {
        const folderPath = selectedIconsWithFolders.get(iconName) || "Root";
        
        // Reset Grey group to original grey color based on current mode
        promises.push(
          axios.post(`${backendUrl}/update_color`, {
            icon_name: iconName + ".svg",
            group_id: "Grey",
            color: darkMode ? "#D3D3D3" : "#282828", // Light grey for dark mode, dark grey for light mode
            type: "icon",
            folder: folderPath,
            mode: darkMode ? "dark" : "light"
          })
        );
        
        // Reset Color group to original blue color (#00ABF6)
        promises.push(
          axios.post(`${backendUrl}/update_color`, {
            icon_name: iconName + ".svg",
            group_id: "Color",
            color: "#00ABF6", // Original blue color
            type: "icon",
            folder: folderPath,
            mode: darkMode ? "dark" : "light"
          })
        );
      }
      
      await Promise.all(promises);
      
      // Force refresh of the preview by updating the selectedIcons set
      setSelectedIcons(prev => new Set(prev));
      
      toast.success(`Reset ${selectedIconList.length} icons to original colors!`);
    } catch (error) {
      console.error('Error resetting multiple icons to original colors:', error);
      toast.error("Failed to reset some icons to original colors");
    } finally {
      setLoading(false);
    }
  };

  const resetMultipleSingleColorIconsToOriginal = async () => {
    if (activeTab !== "single-color") return;
    
    const selectedIconList = Array.from(selectedSingleColorIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      
      // Reset all selected single color icons to original colors
      const promises = selectedIconList.map(iconName => {
        return axios.post(`${backendUrl}/single-color/revert`, {
          icon_name: iconName + ".svg",
          mode: darkMode ? "dark" : "light"
        });
      });
      
      await Promise.all(promises);
      
      // Force refresh of the preview by updating the selectedSingleColorIcons set
      setSelectedSingleColorIcons(prev => new Set(prev));
      
      toast.success(`Reset ${selectedIconList.length} single color icons to original colors!`);
    } catch (error) {
      console.error('Error resetting multiple single color icons to original colors:', error);
      toast.error("Failed to reset some single color icons to original colors");
    } finally {
      setLoading(false);
    }
  };

  const handleIconClick = (iconName) => {
    try {
      if (isMultiSelectMode) {
        toggleIconSelection(iconName);
        // Don't call loadGroups in multi-select mode to prevent crashes
        return;
      }
      
      setSelectedIcon(iconName);
      const folderPath = currentFolder || "Root";
      const modeSuffix = darkMode ? "-dark" : "-light";
      const svgUrlToSet = folderPath === "Root" 
        ? `${backendUrl}/static-icons${modeSuffix}/${iconName}.svg`
        : `${backendUrl}/static-icons${modeSuffix}/${folderPath}/${iconName}.svg`;
      setSvgUrl(svgUrlToSet);
      
      // Only call loadGroups if it exists
      if (typeof loadGroups === 'function') {
        loadGroups(iconName, folderPath);
      }
    } catch (error) {
      console.error('Error in handleIconClick:', error);
    }
  };

  const handleColorfulIconClick = (iconName) => {
    try {
      if (isMultiSelectMode) {
        toggleIconSelection(iconName);
        // Don't update preview in multi-select mode to prevent crashes
        return;
      }
      
      setSelectedIcon(iconName);
      setIsGreyscale(false); // Reset greyscale state for new icon
      const folderPath = currentFolder || "Root";
      const svgUrlToSet = folderPath === "Root" 
        ? `${backendUrl}/colorful-icons/${iconName}.svg`
        : `${backendUrl}/colorful-icons/${folderPath}/${iconName}.svg`;
      setSvgUrl(svgUrlToSet);
    } catch (error) {
      console.error('Error in handleColorfulIconClick:', error);
    }
  };

  const handleSingleColorIconClick = (iconName) => {
    try {
      if (isMultiSelectMode) {
        toggleIconSelection(iconName);
        // Set the selected icon for display purposes even in multi-select mode
        setSelectedIcon(iconName);
        setSelectedGroup("entire_icon"); // Set a special group for single color icons
        
        // Set default color for single color icons based on current mode
        const defaultColor = darkMode ? "#D3D3D3" : "#282828";
        setCurrentColor(defaultColor);
        setLocalPreviewColor(defaultColor);
        
        // Apply the default color to the single color icon immediately
        setLoading(true);
        axios.post(`${backendUrl}/single-color/update`, {
          icon_name: iconName,
          color: defaultColor,
          mode: darkMode ? "dark" : "light"
        }, {
          headers: { 'Content-Type': 'application/json' }
        }).then(res => {
          // Refresh the icon to show the new color with mode-specific URLs
          const modeSuffix = darkMode ? "-dark" : "-light";
          const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.png`;
          const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.svg`;
          
          fetch(svgUrl, { method: 'HEAD' })
            .then(response => {
              if (response.ok) {
                setSvgUrl(`${svgUrl}?t=${Date.now()}`);
              } else {
                setSvgUrl(`${pngUrl}?t=${Date.now()}`);
              }
            })
            .catch(() => {
              setSvgUrl(`${pngUrl}?t=${Date.now()}`);
            });
          
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
          // Fallback to original loading if color update fails
          const modeSuffix = darkMode ? "-dark" : "-light";
          const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.png`;
          const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.svg`;
          
          fetch(svgUrl, { method: 'HEAD' })
            .then(response => {
              if (response.ok) {
                setSvgUrl(svgUrl);
              } else {
                setSvgUrl(pngUrl);
              }
            })
            .catch(() => {
              setSvgUrl(pngUrl);
            });
        });
        return;
      }
      
      setSelectedIcon(iconName);
      setSelectedGroup("entire_icon"); // Set a special group for single color icons
      
      // Set default color for single color icons based on current mode
      const defaultColor = darkMode ? "#D3D3D3" : "#282828";
      setCurrentColor(defaultColor);
      setLocalPreviewColor(defaultColor);
      
      // Apply the default color to the single color icon immediately
      setLoading(true);
      axios.post(`${backendUrl}/single-color/update`, {
        icon_name: iconName,
        color: defaultColor,
        mode: darkMode ? "dark" : "light"
      }, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        // Refresh the icon to show the new color with mode-specific URLs
        const modeSuffix = darkMode ? "-dark" : "-light";
        const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.png`;
        const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.svg`;
        
        fetch(svgUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              setSvgUrl(`${svgUrl}?t=${Date.now()}`);
            } else {
              setSvgUrl(`${pngUrl}?t=${Date.now()}`);
            }
          })
          .catch(() => {
            setSvgUrl(`${pngUrl}?t=${Date.now()}`);
          });
        
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
        // Fallback to original loading if color update fails
        const modeSuffix = darkMode ? "-dark" : "-light";
        const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.png`;
        const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${iconName}.svg`;
        
        fetch(svgUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              setSvgUrl(svgUrl);
            } else {
              setSvgUrl(pngUrl);
            }
          })
          .catch(() => {
            setSvgUrl(pngUrl);
          });
      });
    } catch (error) {
      console.error('Error in handleSingleColorIconClick:', error);
    }
  };

  const handleFlagClick = (flagName) => {
    try {
      if (isMultiSelectMode) {
        toggleIconSelection(flagName);
        // Set the selected country for display purposes even in multi-select mode
        setSelectedCountry(flagName);
        const svgUrlToSet = `${backendUrl}/flags/${flagName}.svg`;
        setSvgUrl(svgUrlToSet);
        return;
      }
      
      setSelectedIcon(flagName);
      setSelectedCountry(flagName);
      const svgUrlToSet = `${backendUrl}/flags/${flagName}.svg`;
      setSvgUrl(svgUrlToSet);
      
      // Only call loadGroups if it exists
      if (typeof loadGroups === 'function') {
        loadGroups(flagName, "flags");
      }
    } catch (error) {
      console.error('Error in handleFlagClick:', error);
    }
  };

  const handleSearchResultClick = (result) => {
    if (isMultiSelectMode) {
      toggleIconSelection(result.name);
      return;
    }
    
    setSelectedIcon(result.name);
    setCurrentFolder(result.folder);
    
    // Set the appropriate SVG URL based on the result type
    let svgUrlToSet;
    if (result.type === 'icon') {
      const modeSuffix = darkMode ? "-dark" : "-light";
      svgUrlToSet = result.folder === "Root" 
        ? `${backendUrl}/static-icons${modeSuffix}/${result.name}.svg`
        : `${backendUrl}/static-icons${modeSuffix}/${result.folder}/${result.name}.svg`;
      loadGroups(result.name, result.folder);
    } else if (result.type === 'colorful-icon') {
      svgUrlToSet = result.folder === "Root" 
        ? `${backendUrl}/colorful-icons/${result.name}.svg`
        : `${backendUrl}/colorful-icons/${result.folder}/${result.name}.svg`;
      setIsGreyscale(false); // Reset greyscale state for colorful icon
    } else if (result.type === 'flag') {
      svgUrlToSet = `${backendUrl}/flags/${result.name}.svg`;
      loadGroups(result.name, "flags");
    }
    
    setSvgUrl(svgUrlToSet);
    setSearchTerm('');
  };

  const handleCopySvg = async () => {
    try {
      // Determine the icon name and type
      let iconName, type, folder;
      if (activeTab === "flags" && selectedCountry) {
        iconName = getFlagFilename(selectedCountry, flagType);
        type = "flag";
      } else if (activeTab === "single-color") {
        iconName = selectedIcon + ".svg"; // For single color icons
        type = "icon";
        folder = "SingleColor";
      } else if (activeTab === "colorful-icons") {
        iconName = selectedIcon + ".svg"; // For colorful icons
        type = "colorful-icon";
        folder = currentFolder || "Root";
      } else {
        iconName = selectedIcon + ".svg"; // Append .svg extension for icons
        type = "icon";
        folder = currentFolder || "Root";
      }

      // Call the backend to get SVG content
      const requestData = {
        icon_name: iconName,
        type: type,
        mode: darkMode ? "dark" : "light"
      };
      
      if (type === "icon" || type === "colorful-icon") {
        requestData.folder = folder;
      }
      
      console.log('Copying SVG with request data:', requestData);
      
      const response = await axios.post(`${backendUrl}/export-svg`, requestData);
      console.log('Response received:', response.data);
      
      if (response.data.svg_content) {
        console.log('SVG content length:', response.data.svg_content.length);
        
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(response.data.svg_content);
            console.log('SVG copied to clipboard successfully');
            toast.success("SVG copied to clipboard!");
          } catch (clipboardError) {
            console.error('Clipboard API failed:', clipboardError);
            // Fallback to old method
            fallbackCopyTextToClipboard(response.data.svg_content);
            toast.success("SVG copied to clipboard!");
          }
        } else {
          // Fallback for older browsers
          fallbackCopyTextToClipboard(response.data.svg_content);
          toast.success("SVG copied to clipboard!");
        }
      } else {
        console.error('No SVG content in response:', response.data);
        throw new Error('No SVG content received');
      }
    } catch (error) {
      console.error('Error copying SVG:', error);
      toast.error("Failed to copy SVG");
    }
  }

  const handleCopyAsImage = async () => {
    try {
      // Determine the icon name and type
      let iconName, type, folder;
      if (activeTab === "flags" && selectedCountry) {
        iconName = getFlagFilename(selectedCountry, flagType);
        type = "flag";
      } else if (activeTab === "single-color") {
        iconName = selectedIcon + ".svg"; // For single color icons
        type = "icon";
        folder = "SingleColor";
      } else if (activeTab === "colorful-icons") {
        iconName = selectedIcon + ".svg"; // For colorful icons
        type = "colorful-icon";
        folder = currentFolder || "Root";
      } else {
        iconName = selectedIcon + ".svg"; // Append .svg extension for icons
        type = "icon";
        folder = currentFolder || "Root";
      }

      // Call the backend to get SVG content
      const requestData = {
        icon_name: iconName,
        type: type,
        mode: darkMode ? "dark" : "light"
      };
      
      if (type === "icon" || type === "colorful-icon") {
        requestData.folder = folder;
      }
      
      console.log('Copying as image with request data:', requestData);
      
      const response = await axios.post(`${backendUrl}/export-svg`, requestData);
      
      if (!response.data.svg_content) {
        throw new Error('No SVG content received');
      }
      
      const svgText = response.data.svg_content;
      // Create an image from SVG
      const img = new window.Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const urlObj = URL.createObjectURL(svgBlob);
      img.src = urlObj;
      img.onload = async () => {
        try {
          // Create a canvas with the same size as the SVG image
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 512;
          canvas.height = img.height || 512;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            try {
              if (!blob) throw new Error('Failed to create PNG blob');
              await navigator.clipboard.write([
                new window.ClipboardItem({ 'image/png': blob })
              ]);
              toast.success('Image copied to clipboard!');
            } catch (err) {
              console.error('Clipboard write failed:', err);
              toast.error('Failed to copy image');
            }
          }, 'image/png');
        } finally {
          URL.revokeObjectURL(urlObj);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(urlObj);
        toast.error('Failed to load SVG for image copy');
      };
    } catch (error) {
      console.error('Error copying as image:', error);
      toast.error('Failed to copy as image');
    }
  };

  // BCORE Logo export functions
  const exportBcoreLogoPng = async () => {
    try {
      if (!selectedBcoreItem || selectedBcoreItem.type !== 'logo') {
        toast.error("No logo selected for export");
        return;
      }

      // Check if this is a frontend logo (starts with /Bcore_Images_Video/Logos/)
      if (selectedBcoreItem.path.startsWith('/Bcore_Images_Video/Logos/')) {
        // Frontend logo - fetch SVG and convert to PNG
        try {
          const response = await fetch(selectedBcoreItem.path);
          const svgText = await response.text();
          
          // Create an image from SVG
          const img = new window.Image();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const urlObj = URL.createObjectURL(svgBlob);
          
          img.src = urlObj;
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = img.width || 512;
              canvas.height = img.height || 512;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = selectedBcoreItem.name.replace('.svg', '.png');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                  toast.success("PNG downloaded successfully!");
                } else {
                  toast.error("Failed to create PNG");
                }
              }, 'image/png');
            } finally {
              URL.revokeObjectURL(urlObj);
            }
          };
          img.onerror = () => {
            URL.revokeObjectURL(urlObj);
            toast.error("Failed to load SVG for conversion");
          };
        } catch (error) {
          console.error('Error processing frontend logo:', error);
          toast.error("Failed to process logo");
        }
        return;
      }

      // Backend logo - call the backend to convert and download PNG
      const requestData = {
        icon_name: selectedBcoreItem.name,
        type: "bcore-logo",
        mode: darkMode ? "dark" : "light"
      };
      
      const response = await axios.post(`${backendUrl}/export-png`, requestData, {
        responseType: 'blob'
      });

      // Check if we got SVG (Cairo not available) or PNG
      const contentType = response.headers['content-type'];
      
      if (contentType && contentType.includes('image/svg+xml')) {
        // Cairo not available, convert SVG to PNG in frontend
        const svgText = await response.data.text();
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
        const urlObj = URL.createObjectURL(svgBlob);
        
        const img = new window.Image();
        img.src = urlObj;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width || 512;
            canvas.height = img.height || 512;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob((blob) => {
              if (blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = selectedBcoreItem.name.replace('.svg', '.png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success("PNG downloaded successfully!");
              } else {
                toast.error("Failed to create PNG");
              }
            }, 'image/png');
          } finally {
            URL.revokeObjectURL(urlObj);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(urlObj);
          toast.error("Failed to load SVG for conversion");
        };
      } else {
        // Cairo available, direct PNG download
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = selectedBcoreItem.name.replace('.svg', '.png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("PNG downloaded successfully!");
      }
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast.error("Failed to download PNG");
    }
  };

  const exportBcoreLogoSvg = async () => {
    try {
      if (!selectedBcoreItem || selectedBcoreItem.type !== 'logo') {
        toast.error("No logo selected for export");
        return;
      }

      // Check if this is a frontend logo (starts with /Bcore_Images_Video/Logos/)
      if (selectedBcoreItem.path.startsWith('/Bcore_Images_Video/Logos/')) {
        // Frontend logo - fetch SVG and download directly
        try {
          const response = await fetch(selectedBcoreItem.path);
          const svgText = await response.text();
          
          // Create and download the SVG file
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const url = window.URL.createObjectURL(svgBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = selectedBcoreItem.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          toast.success("SVG downloaded successfully!");
        } catch (error) {
          console.error('Error processing frontend logo:', error);
          toast.error("Failed to process logo");
        }
        return;
      }

      // Backend logo - call the backend to get SVG content
      const requestData = {
        icon_name: selectedBcoreItem.name,
        type: "bcore-logo",
        mode: darkMode ? "dark" : "light"
      };
      
      const response = await axios.post(`${backendUrl}/export-svg`, requestData);
      
      if (!response.data.svg_content) {
        throw new Error('No SVG content received');
      }
      
      // Create and download the SVG file
      const svgBlob = new Blob([response.data.svg_content], { type: 'image/svg+xml' });
      const url = window.URL.createObjectURL(svgBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedBcoreItem.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("SVG downloaded successfully!");
    } catch (error) {
      console.error('Error downloading SVG:', error);
      toast.error("Failed to download SVG");
    }
  };

  const downloadBcoreFile = async () => {
    try {
      if (!selectedBcoreItem) {
        toast.error("No item selected for download");
        return;
      }

      // Use the new download endpoint
      const response = await axios.post(`${backendUrl}/bcore-download`, {
        filename: selectedBcoreItem.name
      }, {
        responseType: 'blob'
      });

      // Create and download the file
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedBcoreItem.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("File downloaded successfully!");
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error("Failed to download file");
    }
  };

  const handleBcoreImageCopyAsImage = async () => {
    try {
      if (!selectedBcoreItem || selectedBcoreItem.type !== 'image') {
        toast.error("No image selected for copy");
        return;
      }

      console.log('Starting BCORE image copy process...');
      console.log('Selected item:', selectedBcoreItem);

      // Fetch the image as a blob
      const response = await axios.get(selectedBcoreItem.path, {
        responseType: 'blob'
      });

      console.log('Image fetched successfully, size:', response.data.size);

      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.write) {
        console.log('Using modern clipboard API');
        await navigator.clipboard.write([
          new window.ClipboardItem({ 'image/png': response.data })
        ]);
        console.log('Successfully copied to clipboard using modern API');
        toast.success('Image copied to clipboard!');
      } else {
        console.log('Modern clipboard API not available, using fallback');
        // Fallback: try to copy as data URL
        const canvas = document.createElement('canvas');
        const img = new window.Image();
        const urlObj = URL.createObjectURL(response.data);
        img.src = urlObj;
        img.onload = () => {
          try {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(dataUrl);
              console.log('Copied data URL to clipboard as fallback');
              toast.success('Image copied to clipboard! (as data URL)');
            } else {
              fallbackCopyTextToClipboard(dataUrl);
              console.log('Copied data URL to clipboard as final fallback');
              toast.success('Image data URL copied to clipboard!');
            }
          } finally {
            URL.revokeObjectURL(urlObj);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(urlObj);
          toast.error('Failed to load image for copy');
        };
      }
    } catch (error) {
      console.error('Error copying image:', error);
      toast.error('Failed to copy image');
    }
  };

  const handleBcoreLogoCopyAsImage = async () => {
    try {
      if (!selectedBcoreItem || selectedBcoreItem.type !== 'logo') {
        toast.error("No logo selected for copy");
        return;
      }

      console.log('Starting BCORE logo copy process...');
      console.log('Selected item:', selectedBcoreItem);

      // Check if this is a frontend logo (starts with /Bcore_Images_Video/Logos/)
      if (selectedBcoreItem.path.startsWith('/Bcore_Images_Video/Logos/')) {
        // Frontend logo - fetch SVG and copy to clipboard
        try {
          const response = await fetch(selectedBcoreItem.path);
          const svgText = await response.text();
          console.log('Frontend SVG content length:', svgText.length);
          
          // Create an image from SVG
          const img = new window.Image();
          const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
          const urlObj = URL.createObjectURL(svgBlob);
          
          console.log('Created blob URL for frontend logo:', urlObj);
          
          img.src = urlObj;
          
          img.onload = async () => {
            console.log('Frontend logo image loaded successfully, dimensions:', img.width, 'x', img.height);
            try {
              // Create a canvas with the same size as the SVG image
              const canvas = document.createElement('canvas');
              canvas.width = img.width || 512;
              canvas.height = img.height || 512;
              const ctx = canvas.getContext('2d');
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              console.log('Canvas created with dimensions:', canvas.width, 'x', canvas.height);
              
              // Convert canvas to blob
              canvas.toBlob(async (blob) => {
                try {
                  if (!blob) {
                    console.error('Failed to create PNG blob');
                    throw new Error('Failed to create PNG blob');
                  }
                  
                  console.log('Blob created successfully, size:', blob.size);
                  
                  // Check if clipboard API is available
                  if (navigator.clipboard && navigator.clipboard.write) {
                    console.log('Using modern clipboard API');
                    await navigator.clipboard.write([
                      new window.ClipboardItem({ 'image/png': blob })
                    ]);
                    console.log('Successfully copied frontend logo to clipboard using modern API');
                    toast.success('Logo copied to clipboard!');
                  } else {
                    console.log('Modern clipboard API not available, using fallback');
                    // Fallback: try to copy as data URL
                    const dataUrl = canvas.toDataURL('image/png');
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(dataUrl);
                      console.log('Copied data URL to clipboard as fallback');
                      toast.success('Logo copied to clipboard! (as data URL)');
                    } else {
                      // Final fallback: copy SVG text
                      fallbackCopyTextToClipboard(svgText);
                      console.log('Copied SVG text to clipboard as final fallback');
                      toast.success('SVG code copied to clipboard!');
                    }
                  }
                } catch (err) {
                  console.error('Clipboard write failed:', err);
                  
                  // Try fallback methods
                  try {
                    console.log('Trying fallback clipboard methods...');
                    const dataUrl = canvas.toDataURL('image/png');
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      await navigator.clipboard.writeText(dataUrl);
                      toast.success('Logo copied to clipboard! (as data URL)');
                    } else {
                      fallbackCopyTextToClipboard(svgText);
                      toast.success('SVG code copied to clipboard!');
                    }
                  } catch (fallbackErr) {
                    console.error('All clipboard methods failed:', fallbackErr);
                    toast.error('Failed to copy logo. Please try downloading instead.');
                  }
                }
              }, 'image/png');
            } finally {
              URL.revokeObjectURL(urlObj);
            }
          };
          
          img.onerror = (e) => {
            console.error('Frontend logo image loading error:', e);
            URL.revokeObjectURL(urlObj);
            toast.error('Failed to load SVG for image copy');
          };
        } catch (error) {
          console.error('Error processing frontend logo:', error);
          toast.error('Failed to process frontend logo');
        }
        return;
      }

      // Backend logo - call the backend to get SVG content
      const requestData = {
        icon_name: selectedBcoreItem.name,
        type: "bcore-logo",
        mode: darkMode ? "dark" : "light"
      };
      
      console.log('Copying BCORE logo as image with request data:', requestData);
      
      const response = await axios.post(`${backendUrl}/export-svg`, requestData);
      console.log('Backend response:', response.data);
      
      if (!response.data.svg_content) {
        console.error('No SVG content in response:', response.data);
        throw new Error('No SVG content received');
      }
      
      const svgText = response.data.svg_content;
      console.log('SVG content length:', svgText.length);
      
      // Create an image from SVG
      const img = new window.Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const urlObj = URL.createObjectURL(svgBlob);
      
      console.log('Created blob URL:', urlObj);
      
      img.src = urlObj;
      
      img.onload = async () => {
        console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
        try {
          // Create a canvas with the same size as the SVG image
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 512;
          canvas.height = img.height || 512;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          console.log('Canvas created with dimensions:', canvas.width, 'x', canvas.height);
          
          // Convert canvas to blob
          canvas.toBlob(async (blob) => {
            try {
              if (!blob) {
                console.error('Failed to create PNG blob');
                throw new Error('Failed to create PNG blob');
              }
              
              console.log('Blob created successfully, size:', blob.size);
              
              // Check if clipboard API is available
              if (navigator.clipboard && navigator.clipboard.write) {
                console.log('Using modern clipboard API');
                await navigator.clipboard.write([
                  new window.ClipboardItem({ 'image/png': blob })
                ]);
                console.log('Successfully copied to clipboard using modern API');
                toast.success('Logo copied to clipboard!');
              } else {
                console.log('Modern clipboard API not available, using fallback');
                // Fallback: try to copy as data URL
                const dataUrl = canvas.toDataURL('image/png');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(dataUrl);
                  console.log('Copied data URL to clipboard as fallback');
                  toast.success('Logo copied to clipboard! (as data URL)');
                } else {
                  // Final fallback: copy SVG text
                  fallbackCopyTextToClipboard(svgText);
                  console.log('Copied SVG text to clipboard as final fallback');
                  toast.success('SVG code copied to clipboard!');
                }
              }
            } catch (err) {
              console.error('Clipboard write failed:', err);
              
              // Try fallback methods
              try {
                console.log('Trying fallback clipboard methods...');
                const dataUrl = canvas.toDataURL('image/png');
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(dataUrl);
                  toast.success('Logo copied to clipboard! (as data URL)');
                } else {
                  fallbackCopyTextToClipboard(svgText);
                  toast.success('SVG code copied to clipboard!');
                }
              } catch (fallbackErr) {
                console.error('All clipboard methods failed:', fallbackErr);
                toast.error('Failed to copy logo. Please try downloading instead.');
              }
            }
          }, 'image/png');
        } finally {
          URL.revokeObjectURL(urlObj);
          console.log('Cleaned up blob URL');
        }
      };
      
      img.onerror = (e) => {
        console.error('Failed to load SVG image:', e);
        URL.revokeObjectURL(urlObj);
        toast.error('Failed to load SVG for logo copy');
      };
    } catch (error) {
      console.error('Error copying logo as image:', error);
      toast.error('Failed to copy logo as image');
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`} 
         style={{
           backgroundImage: darkMode 
             ? 'linear-gradient(rgba(0, 0, 0, 0.84), rgba(0, 0, 0, 0.84)), url(/icons2.jpg)' 
             : 'linear-gradient(rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0.5)), url(/icons2.jpg)',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed'
         }}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        transition={Slide}
      />
      
      {/* Top Navigation */}
      <TopNavigation 
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        setShowFeedbackModal={setShowFeedbackModal}
        isAdmin={isAdmin}
        backendUrl={backendUrl}
        setAllFeedback={setAllFeedback}
        setShowFeedbackAdmin={setShowFeedbackAdmin}
      />
      
      <div className="container mx-auto px-4 py-8 pb-16">
        {/* Header */}
        <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-10 rounded-sm shadow-lg max-w-6xl mx-auto mb-8`}>
          <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                <img src={darkMode ? "/Icon Manager_dark.svg" : "/Icon Manager.svg"} alt="Icon Manager Logo" className="w-12 h-12 mr-2" />
                <div>
                <h1 className={`text-3xl font-bold header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {currentPage === "icons" ? "Icon Manager" : currentPage === "infographics" ? "Infographics Manager" : "BCORE Branding"}
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>
                  {currentPage === "icons" ? "Manage and customize your icons" : currentPage === "infographics" ? "Browse and download infographics" : "BCORE branding materials and assets"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {currentPage === "icons" && (
                <>
                  {/* Multi-select toggle */}
                  <button
                    onClick={toggleMultiSelectMode}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                      isMultiSelectMode 
                        ? 'bg-blue-600 text-white' 
                        : darkMode 
                          ? 'bg-[#2E5583] text-white hover:bg-[#1a365d]' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={isMultiSelectMode ? "Exit Multi-Select Mode" : "Enter Multi-Select Mode"}
                  >
                    <img 
                      src="/multiple_choice.svg" 
                      alt="Multi-Selection" 
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">Multi-Selection</span>
                  </button>
                  
                  {/* Selection count */}
                  {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {getSelectedCount()} selected
                    </span>
                  )}
                  
                  {/* Feedback Button */}
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                      darkMode 
                        ? 'bg-[#2E5583] text-white hover:bg-[#1a365d]' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Submit Feedback/Icon Request"
                  >
                    <span className="text-lg">💬</span>
                    <span className="text-sm font-medium">Feedback/Icon Request</span>
                  </button>
                </>
              )}
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>© 2025</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {/* Icons Page Content */}
        <div className={`flex gap-8 ${currentPage === "icons" ? "" : "hidden"}`}>
          {/* Left Panel - Icon List */}
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-4 shadow rounded-sm w-[400px] flex-shrink-0`}>
            <h3 className={`text-xl font-semibold mb-4 header-font ${darkMode ? 'text-white' : ''}`}>
              {activeTab === "colorful-icons" ? "Colorful Icons" : activeTab === "flags" ? "Flags" : "Icons"}
            </h3>
            
            {/* Tabs */}
            <div className="flex mb-4 border-b border-gray-300">
              <button
                onClick={() => handleTabChange("icons")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "icons"
                    ? `${darkMode ? 'text-[#d4db50] border-b-2 border-[#d4db50]' : 'text-[#27a5f3] border-b-2 border-[#27a5f3]'}`
                    : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Icons
              </button>
              <button
                onClick={() => handleTabChange("colorful-icons")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "colorful-icons"
                    ? `${darkMode ? 'text-[#d4db50] border-b-2 border-[#d4db50]' : 'text-[#27a5f3] border-b-2 border-[#27a5f3]'}`
                    : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Colorful Icons
              </button>
              <button
                onClick={() => handleTabChange("single-color")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "single-color"
                    ? `${darkMode ? 'text-[#d4db50] border-b-2 border-[#d4db50]' : 'text-[#27a5f3] border-b-2 border-[#27a5f3]'}`
                    : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Single Color
              </button>
              <button
                onClick={() => handleTabChange("flags")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "flags"
                    ? `${darkMode ? 'text-[#d4db50] border-b-2 border-[#d4db50]' : 'text-[#27a5f3] border-b-2 border-[#27a5f3]'}`
                    : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Flags
              </button>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={
                  activeTab === "icons" && !currentFolder ? "Search all icons..." :
                  activeTab === "colorful-icons" && !currentFolder ? "Search all colorful icons..." :
                  activeTab === "single-color" ? "Search single color icons..." :
                  `Search ${activeTab}...`
                }
                value={searchTerm}
                onChange={(e) => {
                  console.log('Search term changed:', e.target.value);
                  setSearchTerm(e.target.value);
                }}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                }`}
              />
            </div>
            
            {/* View Toggle for Icons/Colorful Icons */}
            {(activeTab === "icons" || activeTab === "colorful-icons") && (
              <div className="flex justify-end mb-2 gap-2">
                <button
                  className={`flex items-center px-2 py-1 rounded ${iconListView === "list" ? (darkMode ? "bg-[#d4db50] text-black" : "bg-[#27a5f3] text-white") : darkMode ? "bg-gray-700 text-white" : "bg-gray-200"}`}
                  onClick={() => setIconListView("list")}
                  title="List View"
                >
                  <span className="text-xs font-medium">List View</span>
                </button>
                <button
                  className={`flex items-center px-2 py-1 rounded ${iconListView === "grid" ? (darkMode ? "bg-[#d4db50] text-black" : "bg-[#27a5f3] text-white") : darkMode ? "bg-gray-700 text-white" : "bg-gray-200"}`}
                  onClick={() => setIconListView("grid")}
                  title="Grid View"
                >
                  <span className="text-xs font-medium">Grid View</span>
                </button>
              </div>
            )}
            
            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto">
              {isLoading && (
                <div className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading icons...
                </div>
              )}
              {/* Icons and Colorful Icons Folder View */}
              {(activeTab === "icons" || activeTab === "colorful-icons") && !currentFolder && !searchTerm && !isLoading && (
                Object.keys(activeTab === "icons" ? folders : colorfulFolders)
                  .filter(folderName => activeTab === "colorful-icons" ? folderName !== "SingleColor" : true)
                  .map(folderName => (
                    <button
                      key={folderName}
                      className={`px-4 py-2 rounded-lg transition border text-left folder-font ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' : 'hover:bg-blue-100 text-gray-700 border-gray-500'}`}
                      onClick={() => loadIconsFromFolder(folderName)}>
                      {folderName} ({(activeTab === "icons" ? folders : colorfulFolders)[folderName].length} icons)
                    </button>
                  ))
              )}
              
              {/* Global Search Results */}
              {(activeTab === "icons" || activeTab === "colorful-icons") && !currentFolder && searchTerm && !isLoading && (
                <>
                  <div className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Search results for "{searchTerm}":
                  </div>
                  {iconListView === "list" ? (
                    filteredItems.map(item => {
                      // Handle both string items (from folder view) and object items (from global search)
                      const itemName = typeof item === 'string' ? item : item.name;
                      const itemFolder = typeof item === 'string' ? currentFolder : item.folder;
                      
                      return (
                        <button
                          key={typeof item === 'string' ? item : `${item.folder}/${item.name}`}
                          className={`px-4 py-2 rounded-lg transition border text-left flex items-center justify-between ${
                            isMultiSelectMode 
                              ? (activeTab === "icons" && selectedIcons && selectedIcons.has(itemName)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(itemName))
                                ? 'bg-blue-600 text-white font-semibold border-blue-600'
                                : darkMode 
                                  ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                  : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                              : selectedIcon === itemName || selectedCountry === itemName 
                                ? 'bg-[#2E5583] text-white font-semibold' 
                                : darkMode 
                                  ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                  : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                          }`}
                          onClick={() => {
                            if (activeTab === "icons") {
                              handleSearchResultClick({ name: itemName, folder: itemFolder, type: 'icon' });
                            } else if (activeTab === "colorful-icons") {
                              handleSearchResultClick({ name: itemName, folder: itemFolder, type: 'colorful-icon' });
                            }
                          }}>
                          <span>
                            {itemName}
                            {typeof item === 'object' && item.folder && (
                              <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({item.folder})
                              </span>
                            )}
                          </span>
                          {isMultiSelectMode && (
                            <span className="ml-2">
                              {(activeTab === "icons" && selectedIcons && selectedIcons.has(itemName)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(itemName))
                                ? '☑️'
                                : '☐'
                              }
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredItems.map(item => {
                        const itemName = typeof item === 'string' ? item : item.name;
                        const itemFolder = typeof item === 'string' ? currentFolder : item.folder;
                        let iconUrl;
                        
                        if (activeTab === "colorful-icons") {
                          iconUrl = itemFolder === "Root" 
                            ? `${backendUrl}/colorful-icons/${itemName}.svg?t=${Date.now()}`
                            : `${backendUrl}/colorful-icons/${itemFolder}/${itemName}.svg?t=${Date.now()}`;
                        } else {
                          const modeSuffix = darkMode ? "-dark" : "-light";
                          iconUrl = itemFolder === "Root" 
                            ? `${backendUrl}/static-icons${modeSuffix}/${itemName}.svg?t=${Date.now()}`
                            : `${backendUrl}/static-icons${modeSuffix}/${itemFolder}/${itemName}.svg?t=${Date.now()}`;
                        }
                        
                        return (
                          <button
                            key={typeof item === 'string' ? item : `${item.folder}/${item.name}`}
                            className={`flex flex-col items-center p-2 rounded-lg border transition w-full h-28 justify-center ${
                              isMultiSelectMode 
                                ? (activeTab === "icons" && selectedIcons && selectedIcons.has(itemName)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(itemName))
                                  ? 'bg-blue-600 text-white font-semibold border-blue-600'
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                    : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                                : selectedIcon === itemName || selectedCountry === itemName 
                                  ? 'bg-[#2E5583] text-white font-semibold' 
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                    : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                            }`}
                            onClick={() => {
                              if (activeTab === "icons") {
                                handleSearchResultClick({ name: itemName, folder: itemFolder, type: 'icon' });
                              } else if (activeTab === "colorful-icons") {
                                handleSearchResultClick({ name: itemName, folder: itemFolder, type: 'colorful-icon' });
                              }
                            }}
                          >
                            <img
                              src={iconUrl}
                              alt={itemName}
                              className="w-12 h-12 object-contain mb-1"
                              onError={e => e.target.style.display = 'none'}
                            />
                            <span className="text-xs truncate w-full text-center">{itemName}</span>
                            {isMultiSelectMode && (
                              <span className="ml-2">
                                {(activeTab === "icons" && selectedIcons && selectedIcons.has(itemName)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(itemName))
                                  ? '☑️'
                                  : '☐'
                                }
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              
              {/* Icons and Colorful Icons List/Grid View */}
              {(activeTab === "icons" || activeTab === "colorful-icons") && currentFolder && (
                <>
                  <button
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                    onClick={() => {
                      setCurrentFolder(null);
                      setIcons([]);
                      setSelectedIcon(null);
                      setSelectedGroup(null);
                      setSvgUrl("");
                      setGroups([]);
                      setGroupColors({});
                      setSearchTerm(""); // Clear search when going back
                    }}>
                    ← Back to Folders
                  </button>
                  {iconListView === "list" ? (
                    filteredItems.map(item => {
                      // Handle both string items (from folder view) and object items (from global search)
                      const itemName = typeof item === 'string' ? item : item.name;
                      const itemFolder = typeof item === 'string' ? currentFolder : item.folder;
                      
                      return (
                        <button
                          key={typeof item === 'string' ? item : `${item.folder}/${item.name}`}
                          className={`px-4 py-2 rounded-lg transition border text-left flex items-center justify-between ${
                            isMultiSelectMode 
                              ? (activeTab === "icons" && selectedIcons && selectedIcons.has(itemName)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(itemName))
                                ? 'bg-blue-600 text-white font-semibold border-blue-600'
                                : darkMode 
                                  ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                  : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                              : selectedIcon === itemName || selectedCountry === itemName 
                                ? 'bg-[#2E5583] text-white font-semibold' 
                                : darkMode 
                                  ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                  : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                          }`}
                          onClick={() => {
                            if (activeTab === "icons") {
                              handleIconClick(itemName);
                            } else if (activeTab === "colorful-icons") {
                              handleColorfulIconClick(itemName);
                            }
                          }}>
                          <span>
                            {itemName}
                            {typeof item === 'object' && item.folder && (
                              <span className={`text-xs ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                ({item.folder})
                              </span>
                            )}
                          </span>
                          {isMultiSelectMode && (
                            <span className="ml-2">
                              {(activeTab === "icons" && selectedIcons && selectedIcons.has(itemName)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(itemName))
                                ? '☑️'
                                : '☐'
                              }
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredItems.map(item => {
                        let iconUrl;
                        const folderPath = currentFolder || "Root";
                        const modeSuffix = darkMode ? "-dark" : "-light";
                        if (activeTab === "colorful-icons") {
                          iconUrl = folderPath === "Root" 
                            ? `${backendUrl}/colorful-icons/${item}.svg?t=${Date.now()}`
                            : `${backendUrl}/colorful-icons/${folderPath}/${item}.svg?t=${Date.now()}`;
                        } else {
                          iconUrl = folderPath === "Root" 
                            ? `${backendUrl}/static-icons${modeSuffix}/${item}.svg?t=${Date.now()}`
                            : `${backendUrl}/static-icons${modeSuffix}/${folderPath}/${item}.svg?t=${Date.now()}`;
                        }
                        return (
                          <button
                            key={item}
                            className={`flex flex-col items-center p-2 rounded-lg border transition w-full h-28 justify-center ${
                              isMultiSelectMode 
                                ? (activeTab === "icons" && selectedIcons && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item))
                                  ? 'bg-blue-600 text-white font-semibold border-blue-600'
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                    : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                                : selectedIcon === item || selectedCountry === item 
                                  ? 'bg-[#2E5583] text-white font-semibold' 
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                    : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                            }`}
                            onClick={() => {
                              if (activeTab === "icons") {
                                handleIconClick(item);
                              } else if (activeTab === "colorful-icons") {
                                handleColorfulIconClick(item);
                              }
                            }}
                          >
                            <img
                              src={iconUrl}
                              alt={item}
                              className="w-12 h-12 object-contain mb-1"
                              onError={e => e.target.style.display = 'none'}
                            />
                            <span className="text-xs truncate w-full text-center">{item}</span>
                            {isMultiSelectMode && (
                              <span className="ml-2">
                                {(activeTab === "icons" && selectedIcons && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item))
                                  ? '☑️'
                                  : '☐'
                                }
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {activeTab === "flags" && (
                <div className="grid grid-cols-3 gap-3">
                  {getCountryNames().map(item => {
                    const flagUrl = `${backendUrl}/flags/${getFlagFilename(item, flagType)}?t=${Date.now()}`;
                    return (
                      <button
                        key={item}
                        className={`flex flex-col items-center p-2 rounded-lg border transition w-full h-28 justify-center relative ${
                          isMultiSelectMode 
                            ? selectedFlags && selectedFlags.has(item)
                              ? 'bg-blue-600 text-white font-semibold border-blue-600'
                              : darkMode 
                                ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                            : selectedIcon === item || selectedCountry === item 
                              ? 'bg-[#2E5583] text-white font-semibold' 
                              : darkMode 
                                ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                        }`}
                        onClick={() => handleFlagClick(item)}>
                        {isMultiSelectMode && (
                          <span className="absolute top-1 right-1 text-lg">
                            {selectedFlags && selectedFlags.has(item) ? '☑️' : '☐'}
                          </span>
                        )}
                        <img
                          src={flagUrl}
                          alt={item}
                          className="w-12 h-12 object-contain mb-1"
                          onError={e => e.target.style.display = 'none'}
                        />
                        <span className="text-xs truncate w-full text-center">{item}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Single Color Icons List */}
              {activeTab === "single-color" && (
                <>
                  {iconListView === "list" ? (
                    filteredItems.map(item => (
                      <button
                        key={item}
                        className={`px-4 py-2 rounded-lg transition border text-left flex items-center justify-between ${
                          selectedIcon === item 
                            ? 'bg-[#2E5583] text-white font-semibold' 
                            : darkMode 
                              ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                              : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                        }`}
                        onClick={() => handleSingleColorIconClick(item)}>
                        <span>{item}</span>
                        {isMultiSelectMode && (
                          <span className="ml-2">
                            {selectedSingleColorIcons && selectedSingleColorIcons.has(item) ? '☑️' : '☐'}
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredItems.map(item => {
                        // Check for both PNG and SVG files with mode-specific URLs
                        const modeSuffix = darkMode ? "-dark" : "-light";
                        const pngUrl = `${backendUrl}/single-color-files${modeSuffix}/${item}.png?t=${Date.now()}`;
                        const svgUrl = `${backendUrl}/single-color-files${modeSuffix}/${item}.svg?t=${Date.now()}`;
                        
                        return (
                          <button
                            key={item}
                            className={`flex flex-col items-center p-2 rounded-lg border transition w-full h-28 justify-center relative ${
                              selectedIcon === item 
                                ? 'bg-[#2E5583] text-white font-semibold' 
                                : darkMode 
                                  ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' 
                                  : 'hover:bg-blue-100 text-gray-700 border-gray-500'
                            }`}
                            onClick={() => handleSingleColorIconClick(item)}
                          >
                            {isMultiSelectMode && (
                              <span className="absolute top-1 right-1 text-lg">
                                {selectedSingleColorIcons && selectedSingleColorIcons.has(item) ? '☑️' : '☐'}
                              </span>
                            )}
                            <img
                              src={svgUrl}
                              alt={item}
                              className="w-12 h-12 object-contain mb-1"
                              onError={(e) => {
                                // If SVG fails, try PNG
                                if (e.target.src === svgUrl) {
                                  e.target.src = pngUrl;
                                } else {
                                  e.target.style.display = 'none';
                                }
                              }}
                            />
                            <span className="text-xs truncate w-full text-center">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {filteredItems.length === 0 && searchTerm && (
                <div className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No items found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-4 shadow rounded-sm w-[450px] flex-shrink-0`}>
            <h3 className={`text-xl font-semibold mb-4 header-font ${darkMode ? 'text-white' : ''}`}>
              {activeTab === "colorful-icons" ? "Colorful Icon Options" : activeTab === "single-color" ? "Single Color Options" : "Color Change"}
            </h3>
                          {(selectedIcon || selectedCountry || (isMultiSelectMode && activeTab === "icons" && selectedIcons && selectedIcons.size > 0) || (isMultiSelectMode && activeTab === "flags" && selectedFlags && selectedFlags.size > 0) || (isMultiSelectMode && activeTab === "colorful-icons") || activeTab === "single-color") ? (
              activeTab === "flags" ? (
                // Flag selection interface
                <div className="flex flex-col gap-3">
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>
                    Selected: {selectedCountry}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFlagTypeChange("rectangle")}
                      disabled={!flagTypeExists(selectedCountry, "rectangle")}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex-1 ${
                        flagType === "rectangle" 
                          ? 'bg-[#2E5583] text-white font-semibold' 
                          : flagTypeExists(selectedCountry, "rectangle")
                            ? darkMode 
                              ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                              : 'hover:bg-blue-100 text-gray-700'
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Rectangle
                    </button>
                    <button
                      onClick={() => handleFlagTypeChange("circle")}
                      disabled={!flagTypeExists(selectedCountry, "circle")}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex-1 ${
                        flagType === "circle" 
                          ? 'bg-[#2E5583] text-white font-semibold' 
                          : flagTypeExists(selectedCountry, "circle")
                            ? darkMode 
                              ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                              : 'hover:bg-blue-100 text-gray-700'
                            : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Circle
                    </button>
                  </div>
                  
                  {/* Multi-select actions for flags */}
                  {isMultiSelectMode && selectedFlags && selectedFlags.size > 0 && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Apply to {selectedFlags.size} selected flags:
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={exportMultipleSvg}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {loading ? 'Exporting...' : 'Export SVGs'}
                        </button>
                        <button
                          onClick={exportMultiplePng}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {loading ? 'Exporting...' : 'Export PNGs'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === "colorful-icons" ? (
                // Colorful icons interface
                <div className="flex flex-col gap-3">
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>
                    Selected: {selectedIcon}
                  </div>
                  {!isMultiSelectMode && (
                    <>
                      <button
                        onClick={convertToGreyscale}
                        disabled={loading}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-gray-100 text-gray-700'}`}
                      >
                        {loading ? "Converting..." : "Convert to Greyscale"}
                      </button>
                      <button
                        onClick={revertToColor}
                        disabled={loading || !isGreyscale}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${
                          !isGreyscale 
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                            : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {loading ? "Reverting..." : "Revert to Color"}
                      </button>
                    </>
                  )}
                  
                  {/* Multi-select actions for colorful icons */}
                  {isMultiSelectMode && activeTab === "colorful-icons" && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedColorfulIcons && selectedColorfulIcons.size > 0 
                          ? `Apply to ${selectedColorfulIcons.size} selected icons:` 
                          : 'Select colorful icons to apply actions:'
                        }
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={convertMultipleToGreyscale}
                          disabled={loading || !selectedColorfulIcons || selectedColorfulIcons.size === 0}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading || !selectedColorfulIcons || selectedColorfulIcons.size === 0
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {loading ? 'Converting...' : 'Convert to Greyscale'}
                        </button>
                        <button
                          onClick={revertMultipleToColor}
                          disabled={loading || !selectedColorfulIcons || selectedColorfulIcons.size === 0}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading || !selectedColorfulIcons || selectedColorfulIcons.size === 0
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {loading ? 'Reverting...' : 'Revert to Color'}
                        </button>
                      </div>
                    </div>
                  )}
                  
                </div>
              ) : activeTab === "single-color" ? (
                // Single color icons interface
                <div className="flex flex-col gap-3">
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>
                    Selected: {selectedIcon}
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'}`}>
                    <p className="text-sm">
                      💡 <strong>Tip:</strong> Single color icons can be recolored entirely. Select a color below to change the entire icon.
                    </p>
                  </div>
                  
                  {/* Multi-select actions for single color icons */}
                  {isMultiSelectMode && activeTab === "single-color" && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedSingleColorIcons && selectedSingleColorIcons.size > 0 
                          ? `Apply to ${selectedSingleColorIcons.size} selected icons:` 
                          : 'Select single color icons to apply actions:'
                        }
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyColorToMultipleSingleColorIcons(currentColor)}
                          disabled={loading || !selectedSingleColorIcons || selectedSingleColorIcons.size === 0}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading || !selectedSingleColorIcons || selectedSingleColorIcons.size === 0
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {loading ? 'Applying...' : 'Apply Color'}
                        </button>
                        <button
                          onClick={resetMultipleSingleColorIconsToOriginal}
                          disabled={loading || !selectedSingleColorIcons || selectedSingleColorIcons.size === 0}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading || !selectedSingleColorIcons || selectedSingleColorIcons.size === 0
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          {loading ? 'Resetting...' : 'Reset to Original'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Icon groups interface
                <div className="flex flex-col gap-3">
                  {(() => {
                    let groupsToShow = [];
                    if (groups && groups.length > 0 && !isMultiSelectMode) {
                      groupsToShow = groups;
                    } else if (isMultiSelectMode) {
                      // Don't show individual group buttons in multi-select mode
                      groupsToShow = [];
                    }
                    
                    return groupsToShow.map((group, idx) => (
                      <button
                        key={idx}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${selectedGroup === group ? 'bg-green-600 text-white font-semibold' : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                        onClick={() => handleGroupClick(group)}>
                        {group}
                      </button>
                    ));
                  })()}
                  
                  {/* Multi-select actions for icons */}
                  {isMultiSelectMode && selectedIcons && selectedIcons.size > 0 && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Apply to {selectedIcons.size} selected icons:
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyColorToMultipleIcons("Grey", currentColor)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {loading ? 'Applying...' : 'Apply Grey Group Color'}
                        </button>
                        <button
                          onClick={() => applyColorToMultipleIcons("Color", currentColor)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {loading ? 'Applying...' : 'Apply Color Group Color'}
                        </button>
                        <button
                          onClick={resetMultipleIconsToOriginal}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-red-600 text-white hover:bg-red-700' 
                                : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          {loading ? 'Resetting...' : 'Reset to Original'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Select an icon to customize
              </div>
            )}

            {/* Color Picker */}
            {(selectedGroup || (isMultiSelectMode && activeTab === "icons" && selectedIcons && selectedIcons.size > 0)) && activeTab === "icons" && (
              <div className="mt-6">
                <h4 className={`text-lg font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Color Picker
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {companyColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => selectCompanyColor(color.hex)}
                      className={`p-3 rounded-lg border-2 transition ${
                        currentColor === color.hex
                          ? 'border-blue-500 scale-105'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                      // Update local state immediately for visual feedback
                      setCurrentColor(e.target.value);
                      setLocalPreviewColor(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Only apply color change when user finishes dragging/releases
                      if (!isMultiSelectMode) {
                        selectCompanyColor(e.target.value);
                      }
                    }}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentColor}
                    onChange={(e) => !isMultiSelectMode ? selectCompanyColor(e.target.value) : setCurrentColor(e.target.value)}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                    placeholder="#000000"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  {!isMultiSelectMode && (
                    <button
                      onClick={resetColor}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg transition ${
                        loading 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : darkMode 
                            ? 'bg-gray-600 text-white hover:bg-gray-700' 
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                      }`}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Single Color Picker */}
            {activeTab === "single-color" && (selectedIcon || (isMultiSelectMode && selectedSingleColorIcons && selectedSingleColorIcons.size > 0)) && (
              <div className="mt-6">
                <h4 className={`text-lg font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Color Picker
                </h4>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {companyColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => selectCompanyColor(color.hex)}
                      className={`p-3 rounded-lg border-2 transition ${
                        currentColor === color.hex
                          ? 'border-blue-500 scale-105'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => {
                      // Update local state immediately for visual feedback
                      setCurrentColor(e.target.value);
                      setLocalPreviewColor(e.target.value);
                    }}
                    onBlur={(e) => {
                      // Only apply color change when user finishes dragging/releases
                      selectCompanyColor(e.target.value);
                    }}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentColor}
                    onChange={(e) => selectCompanyColor(e.target.value)}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                    placeholder="#000000"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={isMultiSelectMode && selectedSingleColorIcons && selectedSingleColorIcons.size > 0 ? resetMultipleSingleColorIconsToOriginal : resetColor}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg transition ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : darkMode 
                          ? 'bg-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {isMultiSelectMode && selectedSingleColorIcons && selectedSingleColorIcons.size > 0 ? 'Reset All Selected' : 'Reset'}
                  </button>
                </div>
              </div>
            )}

            {/* Export Options */}
            {(selectedIcon || (isMultiSelectMode && getSelectedCount && getSelectedCount() > 0)) && activeTab !== "flags" && activeTab !== "single-color" && (
              <div className="mt-6">
                <h4 className={`text-lg font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Export Options
                </h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={isMultiSelectMode ? exportMultipleSvg : exportSvg}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                  >
                    {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 ? `Export ${getSelectedCount()} SVGs` : "Export SVG"}
                  </button>
                  <button
                    onClick={isMultiSelectMode ? exportMultiplePng : exportPng}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                  >
                    {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 ? `Export ${getSelectedCount()} PNGs` : "Export PNG"}
                  </button>
                  {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 && (
                    <>
                      <button
                        onClick={() => exportMultipleZip("svg")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export ZIP (SVG)
                      </button>
                      <button
                        onClick={() => exportMultipleZip("png")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export ZIP (PNG)
                      </button>
                    </>
                  )}
                  {!isMultiSelectMode && (
                    <button
                      onClick={handleCopyAsImage}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-pink-100 text-gray-700'}`}
                    >
                      Copy to Clipboard
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Export Options for Single Color Icons */}
            {activeTab === "single-color" && (selectedIcon || (isMultiSelectMode && getSelectedCount && getSelectedCount() > 0)) && (
              <div className="mt-6">
                <h4 className={`text-lg font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Export Options
                </h4>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={isMultiSelectMode ? exportMultipleSvg : exportSvg}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                  >
                    {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 ? `Export ${getSelectedCount()} SVGs` : "Export SVG"}
                  </button>
                  <button
                    onClick={isMultiSelectMode ? exportMultiplePng : exportPng}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                  >
                    {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 ? `Export ${getSelectedCount()} PNGs` : "Export PNG"}
                  </button>
                  {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 && (
                    <>
                      <button
                        onClick={() => exportMultipleZip("svg")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export ZIP (SVG)
                      </button>
                      <button
                        onClick={() => exportMultipleZip("png")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export ZIP (PNG)
                      </button>
                    </>
                  )}
                  {!isMultiSelectMode && (
                    <button
                      onClick={handleCopyAsImage}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-pink-100 text-gray-700'}`}
                    >
                      Copy to Clipboard
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Export Options for Flags */}
            {((selectedCountry && !isMultiSelectMode) || (isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 && activeTab === "flags")) && activeTab === "flags" && (
              <div className="mt-6">
                {!isMultiSelectMode && (
                  <>
                    <h4 className={`text-lg font-semibold mb-3 header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      Export Options
                    </h4>
                  </>
                )}
                <div className="flex gap-2 flex-wrap">
                  {!isMultiSelectMode && (
                    <>
                      <button
                        onClick={exportSvg}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export SVG
                      </button>
                      <button
                        onClick={exportPng}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export PNG
                      </button>
                      <button
                        onClick={handleCopyAsImage}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-pink-100 text-gray-700'}`}
                      >
                        Copy to Clipboard
                      </button>
                    </>
                  )}
                  {isMultiSelectMode && getSelectedCount && getSelectedCount() > 0 && (
                    <>
                      <button
                        onClick={() => exportMultipleZip("svg")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export ZIP (SVG)
                      </button>
                      <button
                        onClick={() => exportMultipleZip("png")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export ZIP (PNG)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-4 shadow rounded-sm flex-1`}>
            <h3 className={`text-xl font-semibold mb-4 header-font ${darkMode ? 'text-white' : ''}`}>
              Preview
            </h3>
            {(() => {
              try {
                if (isMultiSelectMode && getSelectedCount && getSelectedCount() > 0) {
                  // Multi-select preview - grid of small icons
                  return (
                    <div className="h-64 overflow-y-auto">
                      <div className="grid grid-cols-4 gap-3">
                        {(() => {
                          let selectedItems = [];
                          if (activeTab === "icons") {
                            selectedItems = Array.from(selectedIcons || []);
                          } else if (activeTab === "colorful-icons") {
                            selectedItems = Array.from(selectedColorfulIcons || []);
                          } else if (activeTab === "flags") {
                            selectedItems = Array.from(selectedFlags || []);
                          }
                          
                          return selectedItems.map((itemName, index) => {
                            let iconUrl;
                            if (activeTab === "flags") {
                              iconUrl = `${backendUrl}/flags/${getFlagFilename(itemName, flagType)}?t=${Date.now()}`;
                            } else if (activeTab === "colorful-icons") {
                              // Use stored folder information for colorful icons
                              const storedFolder = selectedColorfulIconsWithFolders.get(itemName) || "Root";
                              iconUrl = storedFolder === "Root" 
                                ? `${backendUrl}/colorful-icons/${itemName}.svg?t=${Date.now()}`
                                : `${backendUrl}/colorful-icons/${storedFolder}/${itemName}.svg?t=${Date.now()}`;
                            } else {
                              // Use stored folder information for regular icons
                              const storedFolder = selectedIconsWithFolders.get(itemName) || "Root";
                              const modeSuffix = darkMode ? "-dark" : "-light";
                              iconUrl = storedFolder === "Root" 
                                ? `${backendUrl}/static-icons${modeSuffix}/${itemName}.svg?t=${Date.now()}`
                                : `${backendUrl}/static-icons${modeSuffix}/${storedFolder}/${itemName}.svg?t=${Date.now()}`;
                            }
                            
                            return (
                              <div key={`${itemName}-${Date.now()}`} className="flex flex-col items-center">
                                <div className={`w-24 h-24 rounded-lg border border-gray-200 flex items-center justify-center p-2 ${darkMode ? 'bg-transparent' : 'bg-gray-50'}`}>
                                  <img
                                    src={iconUrl}
                                    alt={itemName}
                                    className="max-w-full max-h-full object-contain"

                                    onError={(e) => {
                                      console.error('Failed to load icon:', itemName, e);
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div className={`text-xs mt-1 text-center truncate w-full ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {itemName}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  );
                } else if (svgUrl) {
                  // Single icon preview
                  return (
                    <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'bg-transparent' : 'bg-gray-50'}`}>
                      <img
                        key={svgUrl}
                        src={svgUrl}
                        alt="Icon Preview"
                        className="max-w-full max-h-full object-contain"

                        onLoad={() => console.log('Image loaded successfully:', svgUrl)}
                        onError={(e) => console.error('Image failed to load:', svgUrl, e)}
                      />
                    </div>
                  );
                } else {
                  // No selection message
                  return (
                    <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'bg-transparent text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                      {isMultiSelectMode && activeTab === "icons" ? (
                        <div className="text-center">
                          <div className="text-lg mb-2">Multi-Select Mode</div>
                          <div className="text-sm">Select icons from the list to see them in preview</div>
                        </div>
                      ) : isMultiSelectMode && activeTab === "colorful-icons" ? (
                        <div className="text-center">
                          <div className="text-lg mb-2">Multi-Select Mode</div>
                          <div className="text-sm">Select colorful icons to see them in preview</div>
                        </div>
                      ) : isMultiSelectMode && activeTab === "flags" ? (
                        <div className="text-center">
                          <div className="text-lg mb-2">Multi-Select Mode</div>
                          <div className="text-sm">Select flags to see them in preview</div>
                        </div>
                      ) : (
                        "Select an icon to preview"
                      )}
                    </div>
                  );
                }
              } catch (error) {
                console.error('Error rendering preview:', error);
                return (
                  <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'bg-transparent text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                    <div className="text-center">
                      <div className="text-lg mb-2">Preview Error</div>
                      <div className="text-sm">Something went wrong loading the preview</div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>

        {/* Infographics Page Content */}
        <div className={`flex gap-8 ${currentPage === "infographics" ? "" : "hidden"}`}>
          {/* Left Panel - Infographics List */}
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-4 shadow rounded-sm w-[400px] flex-shrink-0`}>
            <h3 className={`text-xl font-semibold mb-4 header-font ${darkMode ? 'text-white' : ''}`}>
              Infographics
            </h3>
            
            {/* Theme Selection */}
            <div className="mb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('Light button clicked, setting theme to light');
                    setInfographicTheme('light');
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors font-medium ${
                    infographicTheme === 'light'
                      ? (darkMode ? 'bg-[#d4db50] text-black' : 'bg-[#27a5f3] text-white')
                      : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => {
                    console.log('Bcore button clicked, setting theme to bcore');
                    setInfographicTheme('bcore');
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg transition-colors font-medium ${
                    infographicTheme === 'bcore'
                      ? (darkMode ? 'bg-[#d4db50] text-black' : 'bg-[#27a5f3] text-white')
                      : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                  }`}
                >
                  Bcore
                </button>
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="mb-4">
              <select
                value={infographicCategory}
                onChange={e => setInfographicCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(infographics.map(i => i.category).filter(Boolean))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search infographics..."
                value={infographicSearch}
                onChange={(e) => setInfographicSearch(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                }`}
              />
            </div>
            
            {/* Infographics List */}
            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto">
              {infographics
                .filter(i => (infographicCategory === 'All' || i.category === infographicCategory) &&
                             (typeof i.title === 'string' && i.title.toLowerCase().includes(infographicSearch.toLowerCase())))
                .map(i => (
                  <button
                    key={i.filename}
                    className={`flex items-center gap-3 p-2 rounded-lg transition border text-left ${
                      selectedInfographic && selectedInfographic.filename === i.filename 
                        ? (darkMode ? 'bg-[#2E5583] text-white font-semibold border-[#2E5583]' : 'bg-blue-100 text-blue-800 font-semibold border-blue-600') 
                        : (darkMode ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' : 'hover:bg-blue-100 text-gray-700 border-gray-500')
                    }`}
                    onClick={() => setSelectedInfographic(i)}
                  >
                    <img
                      src={`${backendUrl}/infographics/${i.filename.replace('.png', `_${infographicTheme}.PNG`)}`}
                      alt={i.title}
                      className="w-16 h-16 object-contain rounded bg-gray-100"
                      onError={e => {
                        if (!e.target.src.includes('via.placeholder.com')) {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/64x64?text=No+Image';
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{i.title}</span>
                      <span className="text-xs text-gray-400">Slide: {i.slide_number}</span>
                      <span className="text-xs text-gray-400">Category: {i.category}</span>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Right Panel - Infographics Preview */}
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-4 shadow rounded-sm flex-1`}>
            <h3 className={`text-xl font-semibold mb-4 header-font ${darkMode ? 'text-white' : ''}`}>
              Preview
            </h3>
            
            {selectedInfographic ? (
              <div className="space-y-4">
                {/* Infographic Image */}
                <div className="flex justify-center">
                  <img
                    src={`${backendUrl}/infographics/${selectedInfographic.filename.replace('.png', `_${infographicTheme}.PNG`)}`}
                    alt={selectedInfographic.title}
                    className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                    onError={e => {
                      if (!e.target.src.includes('via.placeholder.com')) {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
                      }
                    }}
                  />
                </div>
                
                {/* Infographic Details */}
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h4 className={`font-semibold header-font text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedInfographic.title}
                  </h4>
                </div>
                
                {/* Download Button */}
                <div className="flex flex-col items-center gap-2">
                  <a
                    href={`${backendUrl}/infographics/${selectedInfographic.filename.replace('.png', '')}/download?theme=${infographicTheme}`}
                    download={`infographics_master_${infographicTheme}.pptx`}
                    onClick={() => {
                      console.log('Download clicked with theme:', infographicTheme);
                      console.log('Download URL:', `${backendUrl}/infographics/${selectedInfographic.filename.replace('.png', '')}/download?theme=${infographicTheme}`);
                    }}
                    className={`px-6 py-3 rounded-lg transition flex items-center gap-2 ${
                      darkMode 
                        ? 'bg-[#2E5583] text-white hover:bg-[#1a365d]' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    <span className="text-lg">📊</span>
                    <span className="font-medium">Download {infographicTheme === 'light' ? 'Light' : 'Bcore'} PowerPoint</span>
                  </a>
                  <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Download the {infographicTheme} PowerPoint file and navigate to slide {selectedInfographic.slide_number}
                  </p>
                </div>
              </div>
            ) : (
              <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'bg-transparent text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <div className="text-center">
                  <div className="text-lg mb-2">No Infographic Selected</div>
                  <div className="text-sm">Select an infographic from the list to preview</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BCORE Branding Page Content */}
        <div className={`flex gap-8 px-8 ${currentPage === "bcore-branding" ? "" : "hidden"}`}>
          {/* Left Panel - BCORE Content List */}
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-4 shadow rounded-sm w-[400px] flex-shrink-0`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-xl font-semibold header-font ${darkMode ? 'text-white' : ''}`}>
                BCORE Branding
              </h3>
              {currentBcoreFolder && (
                <button
                  onClick={() => {
                    setCurrentBcoreFolder(null);
                    setBcoreContent(Object.values(bcoreFolders).flat());
                    setSelectedBcoreItem(null);
                    setBcoreSearch("");
                  }}
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    darkMode 
                      ? 'bg-gray-600 text-white hover:bg-gray-500' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  ← Back to Folders
                </button>
              )}
            </div>
            
            {/* Category Filter */}
            <div className="mb-4">
              <select
                value={bcoreCategory}
                onChange={e => {
                  const selectedCategory = e.target.value;
                  setBcoreCategory(selectedCategory);
                  
                  // If "All" is selected, go back to folder view
                  if (selectedCategory === "All") {
                    setCurrentBcoreFolder(null);
                    setBcoreContent(Object.values(bcoreFolders).flat());
                    setSelectedBcoreItem(null);
                    setBcoreSearch("");
                  } else {
                    // Switch to the selected folder
                    loadBcoreFromFolder(selectedCategory);
                  }
                }}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="All">All Categories</option>
                <option value="Images">Images</option>
                <option value="Videos">Videos</option>
                <option value="Logos">Logos</option>
                <option value="Branding">Branding Materials</option>
              </select>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search BCORE content..."
                value={bcoreSearch}
                onChange={(e) => setBcoreSearch(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                }`}
              />
            </div>
            
            {/* BCORE Content List */}
            <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto">
              {/* BCORE Folder View */}
              {!currentBcoreFolder && !bcoreSearch && (
                Object.keys(bcoreFolders).map(folderName => (
                  <button
                    key={folderName}
                    className={`px-4 py-2 rounded-lg transition border text-left folder-font ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' : 'hover:bg-blue-100 text-gray-700 border-gray-500'}`}
                    onClick={() => loadBcoreFromFolder(folderName)}>
                    {folderName} ({bcoreFolders[folderName].length} items)
                  </button>
                ))
              )}
              
              {/* BCORE Content Items */}
              {currentBcoreFolder && (() => {
                const filteredItems = bcoreContent
                  .filter(item => item.name.toLowerCase().includes(bcoreSearch.toLowerCase()));
                
                // Show grid view for Images, Videos, and Logos folders, horizontal view for Branding, list view for others
                if (currentBcoreFolder === 'Images' || currentBcoreFolder === 'Videos' || currentBcoreFolder === 'Logos') {
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredItems.map(item => (
                        <button
                          key={item.name}
                          className={`flex flex-col items-center p-3 rounded-lg border transition w-full h-32 justify-center ${
                            selectedBcoreItem && selectedBcoreItem.name === item.name 
                              ? (darkMode ? 'bg-[#2E5583] text-white font-semibold border-[#2E5583]' : 'bg-blue-100 text-blue-800 font-semibold border-blue-600') 
                              : (darkMode ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' : 'hover:bg-blue-100 text-gray-700 border-gray-500')
                          }`}
                          onClick={() => setSelectedBcoreItem(item)}
                        >
                          <img
                            src={currentBcoreFolder === 'Videos' ? item.thumbnailPath : 
                                 item.type === 'template' && item.previewPath ? item.previewPath : item.path}
                            alt={item.name}
                            className="max-w-full max-h-20 object-contain mb-2"
                            onError={(e) => {
                              console.error('Image loading error:', e);
                              console.log('Image path:', currentBcoreFolder === 'Videos' ? item.thumbnailPath : 
                                         item.type === 'template' && item.previewPath ? item.previewPath : item.path);
                            }}
                          />
                          <div className="text-xs text-center truncate w-full">
                            {item.name.replace(' copy.png', '').replace(' copy.jpg', '').replace(' copy.mp4', '').replace('.png', '').replace('.jpg', '').replace('.mp4', '').replace('.svg', '').replace('.pptx', '').replace('.ppt', '')}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                } else if (currentBcoreFolder === 'Branding') {
                  return (
                    <div className="flex flex-col gap-4">
                      {filteredItems.map(item => (
                        <button
                          key={item.name}
                          className={`flex items-center gap-4 p-4 rounded-lg border transition w-full h-24 ${
                            selectedBcoreItem && selectedBcoreItem.name === item.name 
                              ? (darkMode ? 'bg-[#2E5583] text-white font-semibold border-[#2E5583]' : 'bg-blue-100 text-blue-800 font-semibold border-blue-600') 
                              : (darkMode ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' : 'hover:bg-blue-100 text-gray-700 border-gray-500')
                          }`}
                          onClick={() => setSelectedBcoreItem(item)}
                        >
                          <img
                            src={item.type === 'template' && item.previewPath ? item.previewPath : item.path}
                            alt={item.name}
                            className="h-16 w-auto object-contain rounded"
                            onError={(e) => {
                              console.error('Image loading error:', e);
                              console.log('Image path:', item.type === 'template' && item.previewPath ? item.previewPath : item.path);
                            }}
                          />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium truncate">
                              {item.name.includes('LinkedIn cover v') ? 
                                item.name.match(/v\d+/)?.[0] || item.name.replace(' copy.png', '').replace(' copy.jpg', '').replace(' copy.mp4', '').replace('.png', '').replace('.jpg', '').replace('.mp4', '').replace('.svg', '').replace('.pptx', '').replace('.ppt', '') :
                                item.name.replace(' copy.png', '').replace(' copy.jpg', '').replace(' copy.mp4', '').replace('.png', '').replace('.jpg', '').replace('.mp4', '').replace('.svg', '').replace('.pptx', '').replace('.ppt', '')
                              }
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                              {item.type === 'template' ? 'PowerPoint Template' : 'LinkedIn Cover'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                } else {
                  // List view for Videos and other folders
                  return filteredItems.map(item => (
                    <button
                      key={item.name}
                      className={`flex items-center gap-3 p-2 rounded-lg transition border text-left ${
                        selectedBcoreItem && selectedBcoreItem.name === item.name 
                          ? (darkMode ? 'bg-[#2E5583] text-white font-semibold border-[#2E5583]' : 'bg-blue-100 text-blue-800 font-semibold border-blue-600') 
                          : (darkMode ? 'hover:bg-[#2E5583] text-white bg-[#4B5563] border-black' : 'hover:bg-blue-100 text-gray-700 border-gray-500')
                      }`}
                      onClick={() => setSelectedBcoreItem(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.name.replace(' copy.png', '').replace(' copy.jpg', '').replace(' copy.mp4', '').replace('.png', '').replace('.jpg', '').replace('.mp4', '').replace('.svg', '').replace('.pptx', '').replace('.ppt', '')}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                          {item.category}
                        </div>
                      </div>
                    </button>
                  ));
                }
              })()}
              
              {/* No content found message */}
              {((currentBcoreFolder && bcoreContent.filter(item => 
                               item.name.toLowerCase().includes(bcoreSearch.toLowerCase())).length === 0) ||
                (!currentBcoreFolder && !bcoreSearch && Object.keys(bcoreFolders).length === 0)) && (
                <div className={`p-4 rounded-lg border text-center ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
                  <div className="text-lg mb-2">🔍</div>
                  <div className="text-sm">No content found</div>
                  <div className="text-xs mt-1">Try adjusting your search or category filter</div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - BCORE Content Preview */}
          <div className={`flex-1 ${darkMode ? 'bg-[#282828]' : 'bg-white'} p-6 shadow rounded-sm`}>
            {selectedBcoreItem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xl font-semibold header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedBcoreItem.name.replace(' copy.png', '').replace(' copy.jpg', '').replace(' copy.mp4', '').replace('.png', '').replace('.jpg', '').replace('.mp4', '').replace('.svg', '').replace('.pptx', '').replace('.ppt', '')}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    selectedBcoreItem.category === 'Videos' ? 'bg-red-100 text-red-800' :
                    selectedBcoreItem.category === 'Images' ? 'bg-blue-100 text-blue-800' :
                    selectedBcoreItem.category === 'Logos' ? 'bg-green-100 text-green-800' :
                    selectedBcoreItem.category === 'Branding' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedBcoreItem.category}
                  </span>
                </div>
                
                <div className="flex justify-center">
                  {selectedBcoreItem.type === 'video' ? (
                    <div className="space-y-2">
                      <video
                        controls
                        className="max-w-full max-h-96 rounded-lg shadow-lg"
                        src={selectedBcoreItem.path}
                        preload="metadata"
                        onError={(e) => {
                          console.error('Video loading error:', e);
                          console.log('Video path:', selectedBcoreItem.path);
                        }}
                        onLoadStart={() => console.log('Video loading started:', selectedBcoreItem.path)}
                        onCanPlay={() => console.log('Video can play:', selectedBcoreItem.path)}
                      >
                        Your browser does not support the video tag.
                      </video>
                      <div className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Debug: {selectedBcoreItem.path}
                      </div>
                    </div>
                  ) : selectedBcoreItem.type === 'template' ? (
                    <div className="space-y-4">
                      <img
                        src={selectedBcoreItem.previewPath || selectedBcoreItem.path}
                        alt={selectedBcoreItem.name}
                        className="max-w-full max-h-96 rounded-lg shadow-lg object-contain"
                        onError={(e) => {
                          console.error('Template preview loading error:', e);
                          console.log('Preview path:', selectedBcoreItem.previewPath);
                        }}
                      />
                      <div className={`text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <div className="text-sm font-medium">PowerPoint Template</div>
                        <div className="text-xs mt-1 opacity-75">
                          Click download to get the template file
                        </div>
                      </div>
                    </div>
                  ) : selectedBcoreItem.type === 'logo' ? (
                    <div className={`flex justify-center p-4 rounded-lg ${darkMode ? 'bg-[#3a3a3a]' : 'bg-gray-50'}`}>
                      <img
                        src={selectedBcoreItem.path}
                        alt={selectedBcoreItem.name}
                        className="w-64 h-48 rounded-lg shadow-lg"
                        style={{ minWidth: '200px', minHeight: '150px' }}
                        onError={(e) => {
                          console.error('Logo loading error:', e);
                          console.log('Logo path:', selectedBcoreItem.path);
                        }}
                      />
                    </div>
                  ) : (
                    <img
                      src={selectedBcoreItem.path}
                      alt={selectedBcoreItem.name}
                      className="max-w-full max-h-96 rounded-lg shadow-lg object-contain"
                      onError={(e) => {
                        console.error('Image loading error:', e);
                        console.log('Image path:', selectedBcoreItem.path);
                      }}
                    />
                  )}
                </div>
                
                <div className="flex justify-center gap-3">
                  {selectedBcoreItem.type === 'logo' ? (
                    <>
                      <button
                        onClick={exportBcoreLogoPng}
                        className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <span className="font-medium">Export PNG</span>
                      </button>
                      <button
                        onClick={exportBcoreLogoSvg}
                        className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        <span className="font-medium">Export SVG</span>
                      </button>
                      <button
                        onClick={handleBcoreLogoCopyAsImage}
                        className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`}
                      >
                        <span className="font-medium">Copy to Clipboard</span>
                      </button>
                    </>
                  ) : selectedBcoreItem.type === 'image' && selectedBcoreItem.category === 'Branding' ? (
                    <>
                      <button
                        onClick={downloadBcoreFile}
                        className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        <span className="font-medium">Download PNG</span>
                      </button>
                      <button
                        onClick={handleBcoreImageCopyAsImage}
                        className={`px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                          darkMode 
                            ? 'bg-purple-600 text-white hover:bg-purple-700' 
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`}
                      >
                        <span className="font-medium">Copy to Clipboard</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={downloadBcoreFile}
                      className={`px-6 py-3 rounded-lg transition flex items-center gap-2 ${
                        darkMode 
                          ? 'bg-[#2E5583] text-white hover:bg-[#1a365d]' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                    >
                      <span className="font-medium">Download {selectedBcoreItem.name.replace(' copy.png', '').replace(' copy.jpg', '').replace(' copy.mp4', '').replace('.png', '').replace('.jpg', '').replace('.mp4', '').replace('.svg', '').replace('.pptx', '').replace('.ppt', '')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'bg-transparent text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                <div className="text-center">
                  <div className="text-lg mb-2">BCORE Branding</div>
                  <div className="text-sm">Select content from the list to preview</div>
                  <div className="text-xs mt-2">Browse your BCORE branding materials</div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-6 rounded-sm shadow-lg max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Submit Feedback
              </h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackType("New Addition");
                  setFeedbackMessage("");
                  setFeedbackEmail("");
                }}
                className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await axios.post(`${backendUrl}/feedback`, {
                  type: feedbackType,
                  message: feedbackMessage,
                  email: feedbackEmail
                });
                
                if (response.data.status === "Feedback submitted successfully") {
                  toast.success("Feedback submitted successfully!");
                  setShowFeedbackModal(false);
                  setFeedbackType("New Addition");
                  setFeedbackMessage("");
                  setFeedbackEmail("");
                } else {
                  toast.error("Failed to submit feedback");
                }
              } catch (error) {
                console.error('Error submitting feedback:', error);
                toast.error("Failed to submit feedback");
              }
            }}>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Feedback Type
                </label>
                <div className="space-y-2">
                  {["New Addition", "UX/UI Improvement", "Bug Report"].map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="radio"
                        name="feedbackType"
                        value={type}
                        checked={feedbackType === type}
                        onChange={(e) => setFeedbackType(e.target.value)}
                        className="mr-2"
                      />
                      <span className={`text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className={`w-full px-3 py-2 border rounded-lg ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                  }`}
                />
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Provide your email if you'd like to receive a response to your feedback
                </p>
              </div>
              
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  Feedback Message
                </label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Please describe your feedback..."
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg resize-none ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                  }`}
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackType("New Addition");
                    setFeedbackMessage("");
                    setFeedbackEmail("");
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    darkMode 
                      ? 'bg-gray-600 text-white hover:bg-gray-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2 rounded-lg transition ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Admin Modal */}
      {showFeedbackAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-[#282828]' : 'bg-white'} p-6 rounded-sm shadow-lg max-w-6xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold header-font ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                All Feedback ({allFeedback.length})
              </h3>
              <button
                onClick={() => setShowFeedbackAdmin(false)}
                className={`p-2 rounded-lg transition ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {allFeedback.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No feedback submitted yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Message</th>
                        <th className="text-left p-2">Timestamp</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFeedback.map((feedback) => (
                        <tr key={feedback.id} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                          <td className="p-2 font-mono text-sm">{feedback.id}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              feedback.type === "Bug Report" ? "bg-red-100 text-red-800" :
                              feedback.type === "UX/UI Improvement" ? "bg-blue-100 text-blue-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {feedback.type}
                            </span>
                          </td>
                          <td className="p-2 max-w-xs">
                            <div className="truncate" title={feedback.message}>
                              {feedback.message}
                            </div>
                          </td>
                          <td className="p-2 text-sm">
                            {new Date(feedback.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <select
                              value={feedback.status}
                              onChange={async (e) => {
                                try {
                                  await axios.put(`${backendUrl}/feedback/${feedback.id}/status`, null, {
                                    params: { status: e.target.value }
                                  });
                                  // Update local state
                                  setAllFeedback(prev => prev.map(f => 
                                    f.id === feedback.id ? { ...f, status: e.target.value } : f
                                  ));
                                  toast.success("Status updated");
                                } catch (error) {
                                  console.error('Error updating status:', error);
                                  toast.error("Failed to update status");
                                }
                              }}
                              className={`px-2 py-1 rounded text-xs border ${
                                darkMode 
                                  ? 'bg-gray-700 border-gray-600 text-white' 
                                  : 'bg-white border-gray-300 text-gray-800'
                              }`}
                            >
                              <option value="new">New</option>
                              <option value="read">Read</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  // Show full message in a toast or alert
                                  toast.info(feedback.message, {
                                    autoClose: false,
                                    closeOnClick: false,
                                    draggable: true
                                  });
                                }}
                                className={`px-2 py-1 rounded text-xs ${
                                  darkMode 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                              >
                                View Full
                              </button>
                              {feedback.email && (
                                <button
                                  onClick={() => {
                                    setSelectedFeedbackForResponse(feedback);
                                    setResponseMessage("");
                                    setShowResponseModal(true);
                                  }}
                                  className={`px-2 py-1 rounded text-xs ${
                                    darkMode 
                                      ? 'bg-green-600 text-white hover:bg-green-700' 
                                      : 'bg-green-500 text-white hover:bg-green-600'
                                  }`}
                                >
                                  Respond
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;