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
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [groups, setGroups] = useState([]);
  const [svgUrl, setSvgUrl] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [currentColor, setCurrentColor] = useState("#FF0000");
  const [localPreviewColor, setLocalPreviewColor] = useState("#FF0000");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("icons"); // "icons" or "flags"
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [flagType, setFlagType] = useState("rectangle"); // "rectangle" or "circle"
  const [groupColors, setGroupColors] = useState({}); // Track colors for each group of current icon

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
//Trigger redeploy
  useEffect(() => {
    axios.get(`${backendUrl}/icons`)
      .then(res => setIcons(res.data.icons))
      .catch(err => console.error(err));
    
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
      // For icons, use existing logic
      setSelectedIcon(itemName);
      const baseUrl = activeTab === "icons" ? `${backendUrl}/static` : `${backendUrl}/flags`;
      setSvgUrl(`${baseUrl}/${itemName}.svg`); // Append .svg extension
      setSelectedGroup(null);
      setGroupColors({}); // Reset group colors for new icon
      
      // Only load groups for icons, not for flags
      if (activeTab === "icons") {
        axios.get(`${backendUrl}/groups/icon/${itemName}.svg`) // Append .svg extension
          .then(res => setGroups(res.data.groups))
          .catch(err => console.error(err));
      } else {
        setGroups([]); // No groups for flags
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
      
      axios.post(`${backendUrl}/update_color`, {
        icon_name: selectedIcon + ".svg", // Append .svg extension for icons
        group_id: selectedGroup,
        color: colorToApply,
        type: activeTab
      }, {
        headers: { 'Content-Type': 'application/json' }
      }).then(res => {
        const baseUrl = activeTab === "icons" ? `${backendUrl}/static` : `${backendUrl}/flags`;
        setSvgUrl(`${baseUrl}/${selectedIcon}.svg?t=${Date.now()}`); // Append .svg extension
        setLoading(false);
        toast.success("Color updated");
      }).catch(err => {
        console.error(err);
        setLoading(false);
        toast.error("Failed to update color.");
      });
    }
  }, [selectedIcon, selectedGroup, activeTab]);

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
      let iconName, type;
      if (activeTab === "flags" && selectedCountry) {
        iconName = getFlagFilename(selectedCountry, flagType);
        type = "flag";
      } else {
        iconName = selectedIcon + ".svg"; // Append .svg extension for icons
        type = "icon";
      }

      // Call the backend to convert and download PNG
      const response = await axios.post(`${backendUrl}/export-png`, {
        icon_name: iconName,
        type: type
      }, {
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
      // For icons, reset specific group
      if (!selectedGroup) return;
      
      try {
        setLoading(true);
        const defaultColor = "#282828"; // Bcore Grey
        
        // Remove the color from groupColors state
        setGroupColors(prev => {
          const newColors = { ...prev };
          delete newColors[selectedGroup];
          return newColors;
        });
        
        await axios.post(`${backendUrl}/update_color`, {
          icon_name: selectedIcon + ".svg", // Append .svg extension for icons
          group_id: selectedGroup,
          color: defaultColor,
          type: activeTab
        }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const baseUrl = activeTab === "icons" ? `${backendUrl}/static` : `${backendUrl}/flags`;
        setSvgUrl(`${baseUrl}/${selectedIcon}.svg?t=${Date.now()}`); // Append .svg extension
        setCurrentColor(defaultColor);
        setLocalPreviewColor(defaultColor);
        setLoading(false);
        toast.success("Color reset to default");
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
    ? icons.filter(item => item.toLowerCase().includes(searchTerm.toLowerCase()))
    : activeTab === "flags"
      ? getCountryNames().filter(country => country.toLowerCase().includes(searchTerm.toLowerCase()))
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
                placeholder={`Search ${activeTab}...`}
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
              {activeTab === "icons" && filteredItems.map(item => (
                <button
                  key={item}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${selectedIcon === item || selectedCountry === item ? 'bg-[#2E5583] text-white font-semibold' : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                  onClick={() => loadGroups(item)}>
                  {item}
                </button>
              ))}
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
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>Color Change</h3>
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
            
            {selectedGroup && (
              <div className="mt-6">
                <div className={`p-4 rounded-lg flex flex-col items-center gap-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <h3 className={`font-medium text-center text-sm ${darkMode ? 'text-white' : ''}`}>
                    Change color for {activeTab === "flags" ? "flag" : "group"}: <span className="font-bold">{activeTab === "flags" ? selectedCountry : selectedGroup}</span>
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
                    svg.removeAttribute("style");
                    svg.removeAttribute("width");
                    svg.removeAttribute("height");
                    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
                    svg.setAttribute("width", "100%");
                    svg.setAttribute("height", "100%");
                    
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