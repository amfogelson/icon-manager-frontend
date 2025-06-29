import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ReactSVG } from 'react-svg';
import { SketchPicker } from 'react-color';
import { ToastContainer, toast, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

let debounceTimer = null;

function App() {
  console.log('VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
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
  const [activeTab, setActiveTab] = useState("icons"); // "icons", "colorful-icons", or "flags"
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [flagType, setFlagType] = useState("rectangle"); // "rectangle" or "circle"
  const [groupColors, setGroupColors] = useState({}); // Track colors for each group of current icon
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [colorfulIcons, setColorfulIcons] = useState([]); // For colorful icons global search
  const [colorfulFolders, setColorfulFolders] = useState({}); // Colorful icons folders

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
//Trigger redeploy
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
      // For icons and colorful icons, use folder-aware logic
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
      } else {
        // Use regular icons path
        if (folderPath === "Root") {
          svgUrlToSet = `${backendUrl}/static/${itemName}.svg`;
        } else {
          svgUrlToSet = `${backendUrl}/static-icons/${folderPath}/${itemName}.svg`;
        }
      }
      console.log('loadGroups setting SVG URL to:', svgUrlToSet);
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

  const handleGroupClick = (group) => {
    setSelectedGroup(group);
    setLocalPreviewColor(currentColor);
  };

  const applyColorChange = useCallback((colorToApply) => {
    if (activeTab === "flags") {
      // For flags, apply color to the entire SVG
      setLoading(true);
      axios.post(`${backendUrl}/update_color`, {
        icon_name: selectedIcon,
        group_id: "entire_flag", // Special identifier for entire flag
        color: colorToApply,
        type: activeTab
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
        folder: folderPath
      }, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        // Update SVG URL with folder path
        if (folderPath === "Root") {
          setSvgUrl(`${backendUrl}/static/${selectedIcon}.svg?t=${Date.now()}`);
        } else {
          setSvgUrl(`${backendUrl}/static-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`);
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
      // Fetch the SVG content
      const response = await fetch(svgUrl);
      const svgContent = await response.text();
      
      // Create a blob with the SVG content
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on active tab
      if (activeTab === "flags" && selectedCountry) {
        const filename = getFlagFilename(selectedCountry, flagType);
        link.download = filename;
      } else {
        link.download = selectedIcon + ".svg"; // Append .svg extension for icons
      }
      
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
      } else {
        iconName = selectedIcon + ".svg"; // Append .svg extension for icons
        type = "icon";
        folder = currentFolder || "Root";
      }

      // Call the backend to convert and download PNG
      const requestData = {
        icon_name: iconName,
        type: type
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
          type: activeTab
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
    } else {
      // For icons, reset specific group to its original color
      if (!selectedGroup) return;
      
      try {
        setLoading(true);
        
        // Determine the original color based on group name
        let originalColor;
        if (selectedGroup.toLowerCase().includes("color")) {
          originalColor = "#00ABF6"; // Blue for Color group
        } else if (selectedGroup.toLowerCase().includes("grey")) {
          originalColor = "#282828"; // Grey for Grey group
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
        
        // Update SVG URL with folder path
        if (folderPath === "Root") {
          setSvgUrl(`${backendUrl}/static/${selectedIcon}.svg?t=${Date.now()}`);
        } else {
          setSvgUrl(`${backendUrl}/static-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`);
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
    applyColorChange(color);
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
  const filteredItems = activeTab === "icons" 
    ? (currentFolder 
        ? icons.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase())).sort()
        : searchTerm && !isLoading && allIcons.length > 0
          ? allIcons.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
          : []
      )
    : activeTab === "colorful-icons"
      ? (currentFolder 
          ? icons.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase())).sort()
          : searchTerm && !isLoading && colorfulIcons.length > 0
            ? colorfulIcons.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name))
            : []
        )
      : activeTab === "flags"
        ? getCountryNames().filter(country => country.toLowerCase().includes(searchTerm.toLowerCase())).sort()
        : [];

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
        // Use regular icons path
        if (folderPath === "Root") {
          svgUrlToSet = `${backendUrl}/static/${itemName}.svg`;
        } else {
          svgUrlToSet = `${backendUrl}/static-icons/${folderPath}/${itemName}.svg`;
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

  return (
    <div className={`${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-gray-900'} min-h-screen font-sans relative`}>
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
        style={{
          backgroundImage: "url('/icons2.jpg')",
          zIndex: 0
        }}
      ></div>
      
      {/* Content */}
      <div className="relative z-10">
        <header className={`flex justify-between items-center px-10 py-6 shadow sticky top-0 z-20 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
            {/* Logo */}
            <svg 
              className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>Icon Manager</h1>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => setDarkMode(!darkMode)} className={`px-4 py-2 rounded ${darkMode ? 'bg-[#2E5583] text-white' : 'bg-[#459b70]'}`}>{darkMode ? 'Light Mode' : 'Dark Mode'}</button>
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>© 2025</div>
          </div>
        </header>

        <div className="flex gap-10 p-10 max-w-7xl mx-auto items-start">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow rounded-xl w-[350px] flex-shrink-0`}>
            {/* Tabs */}
            <div className="flex mb-4 border-b border-gray-300">
              <button
                onClick={() => handleTabChange("icons")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "icons"
                    ? `${darkMode ? 'text-[#2E5583] border-b-2 border-[#2E5583]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Icons
              </button>
              <button
                onClick={() => handleTabChange("colorful-icons")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "colorful-icons"
                    ? `${darkMode ? 'text-[#2E5583] border-b-2 border-[#2E5583]' : 'text-blue-600 border-b-2 border-blue-600'}`
                    : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                }`}
              >
                Colorful Icons
              </button>
              <button
                onClick={() => handleTabChange("flags")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "flags"
                    ? `${darkMode ? 'text-[#2E5583] border-b-2 border-[#2E5583]' : 'text-blue-600 border-b-2 border-blue-600'}`
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
                  `Search ${activeTab}...`
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none'
                }`}
              />
            </div>
            
            <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto">
              {isLoading && (
                <div className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Loading icons...
                </div>
              )}
              {activeTab === "icons" && !currentFolder && !searchTerm && !isLoading && Object.keys(folders).map(folderName => (
                <button
                  key={folderName}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                  onClick={() => loadIconsFromFolder(folderName)}>
                  📁 {folderName} ({folders[folderName].length} icons)
                </button>
              ))}
              {activeTab === "colorful-icons" && !currentFolder && !searchTerm && !isLoading && Object.keys(colorfulFolders).map(folderName => (
                <button
                  key={folderName}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                  onClick={() => loadIconsFromFolder(folderName)}>
                  🎨 {folderName} ({colorfulFolders[folderName].length} icons)
                </button>
              ))}
              {activeTab === "icons" && !currentFolder && searchTerm && filteredItems.map(item => (
                <button
                  key={`${item.folder}-${item.name}`}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                  onClick={() => {
                    console.log('Search result clicked:', item);
                    console.log('Current folders state:', folders);
                    console.log('Backend URL:', backendUrl);
                    
                    // Set the current folder first
                    setCurrentFolder(item.folder);
                    setIcons(folders[item.folder]);
                    setSelectedIcon(null);
                    setSelectedGroup(null);
                    setSvgUrl("");
                    setGroups([]);
                    setGroupColors({});
                    setSearchTerm(""); // Clear search when entering a folder
                    
                    console.log('Set currentFolder to:', item.folder);
                    console.log('Set icons to:', folders[item.folder]);
                    
                    // Set a timeout to ensure the folder loads before selecting the icon
                    setTimeout(() => {
                      console.log('Timeout callback - setting selected icon:', item.name);
                      setSelectedIcon(item.name);
                      // Use the correct SVG URL path based on folder
                      let svgUrlToSet;
                      if (item.folder === "Root") {
                        svgUrlToSet = `${backendUrl}/static/${item.name}.svg`;
                      } else {
                        svgUrlToSet = `${backendUrl}/static-icons/${item.folder}/${item.name}.svg`;
                      }
                      console.log('Setting SVG URL to:', svgUrlToSet);
                      setSvgUrl(svgUrlToSet);
                      console.log('About to call loadGroups with:', item.name);
                      
                      // Call loadGroups with the correct folder information
                      loadGroupsWithFolder(item.name, item.folder);
                    }, 500); // Increased timeout to ensure state is updated
                  }}>
                  🔍 {item.name} <span className="text-xs opacity-70">({item.folder})</span>
                </button>
              ))}
              {activeTab === "colorful-icons" && !currentFolder && searchTerm && filteredItems.map(item => (
                <button
                  key={`${item.folder}-${item.name}`}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                  onClick={() => {
                    console.log('Colorful search result clicked:', item);
                    
                    // Set the current folder first
                    setCurrentFolder(item.folder);
                    setIcons(colorfulFolders[item.folder]);
                    setSelectedIcon(null);
                    setSelectedGroup(null);
                    setSvgUrl("");
                    setGroups([]);
                    setGroupColors({});
                    setSearchTerm(""); // Clear search when entering a folder
                    
                    // Set a timeout to ensure the folder loads before selecting the icon
                    setTimeout(() => {
                      console.log('Timeout callback - setting selected colorful icon:', item.name);
                      setSelectedIcon(item.name);
                      // Use the correct SVG URL path based on folder
                      let svgUrlToSet;
                      if (item.folder === "Root") {
                        svgUrlToSet = `${backendUrl}/colorful-icons/${item.name}.svg`;
                      } else {
                        svgUrlToSet = `${backendUrl}/colorful-icons/${item.folder}/${item.name}.svg`;
                      }
                      console.log('Setting colorful SVG URL to:', svgUrlToSet);
                      setSvgUrl(svgUrlToSet);
                      
                      // Call loadGroups with the correct folder information
                      loadGroupsWithFolder(item.name, item.folder);
                    }, 500); // Increased timeout to ensure state is updated
                  }}>
                  🎨 {item.name} <span className="text-xs opacity-70">({item.folder})</span>
                </button>
              ))}
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
                  {filteredItems.map(item => (
                    <button
                      key={item}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${selectedIcon === item || selectedCountry === item ? 'bg-[#2E5583] text-white font-semibold' : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                      onClick={() => loadGroups(item)}>
                      {item}
                    </button>
                  ))}
                </>
              )}
              {activeTab === "flags" && getCountryNames().map(item => (
                <button
                  key={item}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${selectedIcon === item || selectedCountry === item ? 'bg-[#2E5583] text-white font-semibold' : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                  onClick={() => loadGroups(item)}>
                  {item}
                </button>
              ))}
              {filteredItems.length === 0 && searchTerm && (
                <div className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No items found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow rounded-xl w-[300px] flex-shrink-0`}>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>
              {activeTab === "colorful-icons" ? "Colorful Icon Options" : "Color Change"}
            </h3>
            {selectedIcon || selectedCountry ? (
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
                  <button
                    onClick={exportSvg}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                  >
                    Export SVG
                  </button>
                </div>
              ) : activeTab === "colorful-icons" ? (
                // Colorful icons interface
                <div className="flex flex-col gap-3">
                  <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>
                    Selected: {selectedIcon}
                  </div>
                  <button
                    onClick={convertToGreyscale}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    {loading ? "Converting..." : "Convert to Greyscale"}
                  </button>
                  <button
                    onClick={revertToColor}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-gray-100 text-gray-700'}`}
                  >
                    {loading ? "Reverting..." : "Revert to Color"}
                  </button>
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
                </div>
              ) : (
                // Icon groups interface
                <div className="flex flex-col gap-3">
                  {groups.map((group, idx) => (
                    <button
                      key={idx}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${selectedGroup === group ? 'bg-green-600 text-white font-semibold' : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      onClick={() => handleGroupClick(group)}>
                      {group}
                    </button>
                  ))}
                </div>
              )
            ) : (
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>Select an item to load groups</div>
            )}
            
            {selectedGroup && activeTab === "icons" && (
              <div className="mt-6">
                <div className={`p-4 rounded-lg flex flex-col items-center gap-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`font-medium text-center text-sm ${darkMode ? 'text-white' : ''}`}>
                    Change color for group: <span className="font-bold">{selectedGroup}</span>
                  </h3>
                  
                  {/* Company Colors */}
                  <div className="w-full">
                    <p className={`text-xs mb-2 text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Bcore Colors:</p>
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {companyColors.map((color, index) => (
                        <button
                          key={index}
                          onClick={() => selectCompanyColor(color.hex)}
                          className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                            currentColor === color.hex ? 'border-white shadow-lg' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className={darkMode ? '[&_.sketch-picker]:!bg-gray-800 [&_.sketch-picker]:!border-gray-600 [&_.sketch-picker_input__input]:!bg-gray-300 [&_.sketch-picker_input__input]:!text-black [&_.sketch-picker_input__input]:!border-gray-400 [&_.sketch-picker_input__label]:!text-white [&_.sketch-picker_presets]:!border-gray-600 [&_.sketch-picker_presets]:!bg-gray-800 [&_input]:!text-black [&_input]:!bg-gray-300 [&_.sketch-picker_input__input]:!color-black [&_input]:!color-black' : ''}>
                    <SketchPicker color={currentColor} onChange={handleColorChange} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={exportSvg} className={`px-4 py-2 text-white rounded-lg text-sm ${darkMode ? 'bg-[#2E5583]' : 'bg-green-600'}`}>Export SVG</button>
                    <button onClick={exportPng} className={`px-4 py-2 text-white rounded-lg text-sm ${darkMode ? 'bg-[#2E5583]' : 'bg-green-600'}`}>Export PNG</button>
                    <button onClick={resetColor} className={`px-4 py-2 text-white rounded-lg text-sm ${darkMode ? 'bg-[#2E5583]' : 'bg-gray-600'}`}>Reset to Default</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-start gap-10 flex-1">
            {selectedIcon || selectedCountry ? (
              <div className={`w-[400px] h-[450px] rounded-xl shadow flex justify-center items-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <ReactSVG
                  src={svgUrl}
                  beforeInjection={(svg) => {
                    // Remove any existing style, width, and height attributes
                    svg.removeAttribute("style");
                    svg.removeAttribute("width");
                    svg.removeAttribute("height");
                    
                    // Get the current viewBox or calculate it
                    let viewBox = svg.getAttribute("viewBox");
                    if (!viewBox) {
                      const bbox = svg.getBBox();
                      if (bbox.width > 0 && bbox.height > 0) {
                        viewBox = `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
                        svg.setAttribute("viewBox", viewBox);
                      }
                    }
                    
                    // Parse viewBox to get dimensions
                    let svgWidth, svgHeight;
                    if (viewBox) {
                      const parts = viewBox.split(' ');
                      svgWidth = parseFloat(parts[2]);
                      svgHeight = parseFloat(parts[3]);
                    } else {
                      // Fallback to getBBox if no viewBox
                      const bbox = svg.getBBox();
                      svgWidth = bbox.width;
                      svgHeight = bbox.height;
                    }
                    
                    // Calculate the scale to fit the SVG within the container
                    const containerWidth = 400; // Preview box width
                    const containerHeight = 450; // Preview box height
                    const scaleX = containerWidth / svgWidth;
                    const scaleY = containerHeight / svgHeight;
                    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding
                    
                    // Set preserveAspectRatio to maintain aspect ratio and center the content
                    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
                    
                    // Set width and height based on calculated scale
                    svg.setAttribute("width", `${svgWidth * scale}px`);
                    svg.setAttribute("height", `${svgHeight * scale}px`);
                    
                    // Add CSS to ensure proper centering and no overflow
                    svg.style.maxWidth = "100%";
                    svg.style.maxHeight = "100%";
                    svg.style.overflow = "visible";
                    
                    if (activeTab === "flags" && selectedGroup === "entire_flag") {
                      // For flags, apply color to all elements
                      svg.querySelectorAll("path, circle, rect, polygon, polyline, ellipse, g").forEach(el => {
                        el.setAttribute("fill", localPreviewColor);
                      });
                    } else if (activeTab === "icons") {
                      // For icons, apply all saved group colors
                      Object.entries(groupColors).forEach(([groupName, color]) => {
                        const targetGroup = svg.querySelector(`#${groupName}`);
                        if (targetGroup) {
                          targetGroup.querySelectorAll("path, circle, rect, polygon, polyline, ellipse, g").forEach(el => {
                            el.setAttribute("fill", color);
                          });
                        }
                      });
                      
                      // Also apply preview color to currently selected group if it exists
                      if (selectedGroup && localPreviewColor) {
                        const targetGroup = svg.querySelector(`#${selectedGroup}`);
                        if (targetGroup) {
                          targetGroup.querySelectorAll("path, circle, rect, polygon, polyline, ellipse, g").forEach(el => {
                            el.setAttribute("fill", localPreviewColor);
                          });
                        }
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <div className={`text-xl flex items-center justify-center h-full ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>Select an item to begin</div>
            )}
            {/* Export buttons for icons, only visible when an icon is selected but no group is selected */}
            {activeTab === "icons" && selectedIcon && !selectedGroup && (
              <div className="flex gap-2 mt-4">
                <button onClick={exportSvg} className={`px-4 py-2 text-white rounded-lg text-sm ${darkMode ? 'bg-[#2E5583]' : 'bg-green-600'}`}>Export SVG</button>
                <button onClick={exportPng} className={`px-4 py-2 text-white rounded-lg text-sm ${darkMode ? 'bg-[#2E5583]' : 'bg-green-600'}`}>Export PNG</button>
              </div>
            )}
          </div>
        </div>

        <ToastContainer
          position="bottom-right"
          autoClose={500}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable
          transition={Slide}
        />
      </div>
    </div>
  );
}

export default App;