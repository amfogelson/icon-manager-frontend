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
  const [selectedIcons, setSelectedIcons] = useState(new Set());
  const [selectedColorfulIcons, setSelectedColorfulIcons] = useState(new Set());
  const [selectedFlags, setSelectedFlags] = useState(new Set());
  const [selectedIconsWithFolders, setSelectedIconsWithFolders] = useState(new Map());
  const [selectedColorfulIconsWithFolders, setSelectedColorfulIconsWithFolders] = useState(new Map());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // Toggle multi-select mode
  const [isGreyscale, setIsGreyscale] = useState(false); // Track if current icon is greyscale
  const [iconListView, setIconListView] = useState("grid"); // 'list' or 'grid'
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState("New Addition");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showFeedbackAdmin, setShowFeedbackAdmin] = useState(false);
  const [allFeedback, setAllFeedback] = useState([]);
  const [isAdmin, setIsAdmin] = useState(import.meta.env.VITE_IS_ADMIN === 'true'); // Only true if you set the env var
  const [showLlama, setShowLlama] = useState(false);
  const llamaTimeoutRef = React.useRef(null);

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

  const applyColorChange = useCallback((colorToApply, showToast = true) => {
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
        if (showToast) {
          toast.success("Color updated");
        }
      }).catch(err => {
        console.error(err);
        setLoading(false);
        if (showToast) {
          toast.error("Failed to update color.");
        }
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
        if (showToast) {
          toast.success("Color updated");
        }
      }).catch(err => {
        console.error(err);
        setLoading(false);
        if (showToast) {
          toast.error("Failed to update color.");
        }
      });
    }
  }, [selectedIcon, selectedGroup, activeTab, currentFolder]);

  const handleColorChange = (color) => {
    const hex = color.hex;
    setCurrentColor(hex);
    setLocalPreviewColor(hex);

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      applyColorChange(hex, false); // Don't show toast during sliding
    }, 500); // still debounce backend call
  };

  const handleColorInputChange = (e) => {
    const hex = e.target.value;
    setCurrentColor(hex);
    setLocalPreviewColor(hex);

    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      applyColorChange(hex, false); // Don't show toast during typing
    }, 500);
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

  const exportMultipleSvg = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let selectedItems = [];
      if (activeTab === "icons") {
        selectedItems = Array.from(selectedIcons || []);
      } else if (activeTab === "colorful-icons") {
        selectedItems = Array.from(selectedColorfulIcons || []);
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
          } else {
            svgUrl = folderPath === "Root" 
              ? `${backendUrl}/static/${itemName}.svg`
              : `${backendUrl}/static-icons/${folderPath}/${itemName}.svg`;
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
          } else {
            iconName = itemName + ".svg";
            type = "icon";
          }
          
          const requestData = {
            icon_name: iconName,
            type: type
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

  const exportAsZip = async (format = "svg") => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      let selectedItems = [];
      if (activeTab === "icons") {
        selectedItems = Array.from(selectedIcons || []);
      } else if (activeTab === "colorful-icons") {
        selectedItems = Array.from(selectedColorfulIcons || []);
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
      } else {
        type = "icon";
      }
      
      const requestData = {
        items: selectedItems,
        type: type,
        folder: folderPath,
        format: format
      };
      
      const response = await axios.post(`${backendUrl}/export-zip`, requestData, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `icons_${format}_${Date.now()}.zip`;
      
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
    applyColorChange(color, true); // Show toast for company color selection
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
    
    // Clear multi-select selections when switching tabs
    setSelectedIcons(new Set());
    setSelectedColorfulIcons(new Set());
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
      setSelectedFlags(new Set());
      setSelectedIconsWithFolders(new Map());
      setSelectedColorfulIconsWithFolders(new Map());
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
        
        // Reset Grey group to original grey color (#282828)
        promises.push(
          axios.post(`${backendUrl}/update_color`, {
            icon_name: iconName + ".svg",
            group_id: "Grey",
            color: "#282828", // Original grey color
            type: "icon",
            folder: folderPath
          })
        );
        
        // Reset Color group to original blue color (#00ABF6)
        promises.push(
          axios.post(`${backendUrl}/update_color`, {
            icon_name: iconName + ".svg",
            group_id: "Color",
            color: "#00ABF6", // Original blue color
            type: "icon",
            folder: folderPath
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

  const handleIconClick = (iconName) => {
    try {
      if (isMultiSelectMode) {
        toggleIconSelection(iconName);
        // Don't call loadGroups in multi-select mode to prevent crashes
        return;
      }
      
      setSelectedIcon(iconName);
      const folderPath = currentFolder || "Root";
      const svgUrlToSet = folderPath === "Root" 
        ? `${backendUrl}/static/${iconName}.svg`
        : `${backendUrl}/static-icons/${folderPath}/${iconName}.svg`;
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
    
    // Set the appropriate SVG URL based on the active tab
    let svgUrlToSet;
    if (activeTab === "icons") {
      svgUrlToSet = result.folder === "Root" 
        ? `${backendUrl}/static/${result.name}.svg`
        : `${backendUrl}/static-icons/${result.folder}/${result.name}.svg`;
      loadGroups(result.name, result.folder);
    } else if (activeTab === "colorful-icons") {
      svgUrlToSet = result.folder === "Root" 
        ? `${backendUrl}/colorful-icons/${result.name}.svg`
        : `${backendUrl}/colorful-icons/${result.folder}/${result.name}.svg`;
      setIsGreyscale(false); // Reset greyscale state for colorful icon
    } else if (activeTab === "flags") {
      svgUrlToSet = `${backendUrl}/flags/${result.name}.svg`;
      loadGroups(result.name, "flags");
    }
    
    setSvgUrl(svgUrlToSet);
    setSearchTerm('');
  };

  const handleCopySvg = async () => {
    try {
      let url = svgUrl;
      // For flags, svgUrl is already set correctly
      // For icons and colorful icons, svgUrl is also set correctly
      if (!url) {
        toast.error("No SVG to copy");
        return;
      }
      const response = await fetch(url);
      const svgContent = await response.text();
      await navigator.clipboard.writeText(svgContent);
      toast.success("SVG copied to clipboard!");
    } catch (error) {
      console.error('Error copying SVG:', error);
      toast.error("Failed to copy SVG");
    }
  }

  const handleCopyAsImage = async () => {
    try {
      if (!svgUrl) {
        toast.error("No SVG to copy as image");
        return;
      }

      console.log('Copy as image - URL:', svgUrl);

      // Check if clipboard API is supported
      if (!navigator.clipboard || !navigator.clipboard.write) {
        toast.error("Clipboard API not supported in this browser");
        return;
      }

      console.log('Clipboard API supported, fetching SVG...');
      
      // Use the new CORS-enabled endpoint instead of direct URL
      let corsUrl;
      if (activeTab === "flags" && selectedCountry) {
        corsUrl = `${backendUrl}/svg/flag/Root/${getFlagFilename(selectedCountry, flagType)}`;
      } else if (activeTab === "colorful-icons") {
        const folderPath = currentFolder || "Root";
        corsUrl = `${backendUrl}/svg/colorful-icon/${folderPath}/${selectedIcon}.svg`;
      } else {
        const folderPath = currentFolder || "Root";
        corsUrl = `${backendUrl}/svg/icon/${folderPath}/${selectedIcon}.svg`;
      }
      
      console.log('Using CORS-enabled URL:', corsUrl);
      const response = await fetch(corsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status}`);
      }
      
      const svgText = await response.text();
      console.log('SVG fetched, length:', svgText.length);
      
      // Create an image from SVG
      const img = new Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const urlObj = URL.createObjectURL(svgBlob);
      
      return new Promise((resolve, reject) => {
        img.onload = async () => {
          try {
            // Create a canvas that maintains the SVG's aspect ratio
            const canvas = document.createElement('canvas');
            const maxSize = 512; // Maximum dimension
            
            // Calculate dimensions to maintain aspect ratio
            const aspectRatio = img.width / img.height;
            let canvasWidth, canvasHeight;
            
            if (aspectRatio > 1) {
              // Width is greater than height
              canvasWidth = maxSize;
              canvasHeight = maxSize / aspectRatio;
            } else {
              // Height is greater than or equal to width
              canvasHeight = maxSize;
              canvasWidth = maxSize * aspectRatio;
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }
            
            // Clear the canvas (transparent background)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the SVG image maintaining aspect ratio
            ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
            
            // Convert canvas to blob
            canvas.toBlob(async (blob) => {
              try {
                if (!blob) {
                  throw new Error('Failed to create PNG blob');
                }
                
                // Try to write to clipboard
                await navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]);
                
                toast.success('Image copied to clipboard!');
                resolve();
              } catch (clipboardError) {
                console.error('Clipboard write failed:', clipboardError);
                
                // Fallback: try to copy as data URL
                try {
                  const dataUrl = canvas.toDataURL('image/png');
                  await navigator.clipboard.writeText(dataUrl);
                  toast.success('Image data URL copied to clipboard!');
                  resolve();
                } catch (fallbackError) {
                  console.error('Fallback copy failed:', fallbackError);
                  toast.error('Failed to copy image - browser may not support image copying');
                  reject(fallbackError);
                }
              }
            }, 'image/png', 1.0);
          } catch (error) {
            console.error('Canvas processing error:', error);
            toast.error('Failed to process image');
            reject(error);
          } finally {
            URL.revokeObjectURL(urlObj);
          }
        };
        
        img.onerror = (e) => {
          URL.revokeObjectURL(urlObj);
          console.error('Failed to load SVG for image copy:', e);
          toast.error('Failed to load SVG for image copy');
          reject(e);
        };
        
        img.src = urlObj;
      });
    } catch (error) {
      console.error('Error copying as image:', error);
      toast.error('Failed to copy as image');
    }
  };

  const triggerLlama = () => {
    setShowLlama(true);
    if (llamaTimeoutRef.current) clearTimeout(llamaTimeoutRef.current);
    llamaTimeoutRef.current = setTimeout(() => setShowLlama(false), 3000);
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-10 rounded-xl shadow-lg max-w-6xl mx-auto mb-8`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/Icon Manager.svg" alt="Icon Manager Logo" className="w-10 h-10 mr-2" />
              <div>
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Icon Manager
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>Manage and customize your icons</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-lg transition ${darkMode ? 'bg-[#2E5583] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                
                {/* Feedback Button */}
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                    darkMode 
                      ? 'bg-[#2E5583] text-white hover:bg-[#1a365d]' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title="Submit Feedback"
                >
                  <span className="text-lg">💬</span>
                  <span className="text-sm font-medium">Feedback</span>
                </button>
                
                {/* Admin Feedback Button */}
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
                    className={`px-3 py-2 rounded-lg transition flex items-center gap-2 ${
                      darkMode 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    title="View All Feedback (Admin)"
                  >
                    <span className="text-lg">📊</span>
                    <span className="text-sm font-medium">View Feedback</span>
                  </button>
                )}
                
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
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>© 2025</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Left Panel - Icon List */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow rounded-xl w-[400px] flex-shrink-0`}>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>
              {activeTab === "colorful-icons" ? "Colorful Icons" : activeTab === "flags" ? "Flags" : "Icons"}
            </h3>
            
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
                onClick={e => {
                  if (e.ctrlKey && e.shiftKey) {
                    triggerLlama();
                    e.preventDefault();
                    return;
                  }
                  handleTabChange("colorful-icons");
                }}
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
            
            {/* View Toggle for Icons/Colorful Icons */}
            {(activeTab === "icons" || activeTab === "colorful-icons") && (
              <div className="flex justify-end mb-2 gap-2">
                <button
                  className={`flex items-center px-2 py-1 rounded ${iconListView === "list" ? "bg-blue-500 text-white" : darkMode ? "bg-gray-700 text-white" : "bg-gray-200"}`}
                  onClick={() => setIconListView("list")}
                  title="List View"
                >
                  <span className="mr-1">🔤</span>
                  <span className="text-xs font-medium">List View</span>
                </button>
                <button
                  className={`flex items-center px-2 py-1 rounded ${iconListView === "grid" ? "bg-blue-500 text-white" : darkMode ? "bg-gray-700 text-white" : "bg-gray-200"}`}
                  onClick={() => setIconListView("grid")}
                  title="Grid View"
                >
                  <span className="mr-1">🖼️</span>
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
                Object.keys(activeTab === "icons" ? folders : colorfulFolders).map(folderName => (
                  <button
                    key={folderName}
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                    onClick={() => loadIconsFromFolder(folderName)}>
                    {activeTab === "colorful-icons" ? "🎨" : "📁"} {folderName} ({(activeTab === "icons" ? folders : colorfulFolders)[folderName].length} icons)
                  </button>
                ))
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
                    filteredItems.map(item => (
                      <button
                        key={item}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                          isMultiSelectMode 
                            ? (activeTab === "icons" && selectedIcons && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item))
                              ? 'bg-blue-600 text-white font-semibold border-blue-600'
                              : darkMode 
                                ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                : 'hover:bg-blue-100 text-gray-700'
                            : selectedIcon === item || selectedCountry === item 
                              ? 'bg-[#2E5583] text-white font-semibold' 
                              : darkMode 
                                ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                : 'hover:bg-blue-100 text-gray-700'
                        }`}
                        onClick={() => {
                          if (activeTab === "icons") {
                            handleIconClick(item);
                          } else if (activeTab === "colorful-icons") {
                            handleColorfulIconClick(item);
                          }
                        }}>
                        <span>{item}</span>
                        {isMultiSelectMode && (
                          <span className="ml-2">
                            {(activeTab === "icons" && selectedIcons && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item))
                              ? '☑️'
                              : '☐'
                            }
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredItems.map(item => {
                        let iconUrl;
                        const folderPath = currentFolder || "Root";
                        if (activeTab === "colorful-icons") {
                          iconUrl = folderPath === "Root" 
                            ? `${backendUrl}/colorful-icons/${item}.svg?t=${Date.now()}`
                            : `${backendUrl}/colorful-icons/${folderPath}/${item}.svg?t=${Date.now()}`;
                        } else {
                          iconUrl = folderPath === "Root" 
                            ? `${backendUrl}/static/${item}.svg?t=${Date.now()}`
                            : `${backendUrl}/static-icons/${folderPath}/${item}.svg?t=${Date.now()}`;
                        }
                        return (
                          <button
                            key={item}
                            className={`flex flex-col items-center p-2 rounded-lg border transition w-full h-28 justify-center ${
                              isMultiSelectMode 
                                ? (activeTab === "icons" && selectedIcons && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item))
                                  ? 'bg-blue-600 text-white font-semibold border-blue-600'
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                    : 'hover:bg-blue-100 text-gray-700'
                                : selectedIcon === item || selectedCountry === item 
                                  ? 'bg-[#2E5583] text-white font-semibold' 
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                    : 'hover:bg-blue-100 text-gray-700'
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
              
              {/* Global Search Results for Icons and Colorful Icons */}
              {(activeTab === "icons" || activeTab === "colorful-icons") && !currentFolder && searchTerm && (
                <>
                  <button
                    className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                    onClick={() => setSearchTerm("")}>
                    ← Clear Search
                  </button>
                  {iconListView === "list" ? (
                    filteredItems.map(item => (
                      <button
                        key={`${item.name}-${item.folder}`}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                          isMultiSelectMode 
                            ? (activeTab === "icons" && selectedIcons && selectedIcons.has(item.name)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item.name))
                              ? 'bg-blue-600 text-white font-semibold border-blue-600'
                              : darkMode 
                                ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                : 'hover:bg-blue-100 text-gray-700'
                            : selectedIcon === item.name 
                              ? 'bg-[#2E5583] text-white font-semibold' 
                              : darkMode 
                                ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                : 'hover:bg-blue-100 text-gray-700'
                        }`}
                        onClick={() => handleSearchResultClick(item)}>
                        <span>{item.name} <span className="text-xs opacity-70">({item.folder})</span></span>
                        {isMultiSelectMode && (
                          <span className="ml-2">
                            {(activeTab === "icons" && selectedIcons && selectedIcons.has(item.name)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item.name))
                              ? '☑️'
                              : '☐'
                            }
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {filteredItems.map(item => {
                        let iconUrl;
                        if (activeTab === "colorful-icons") {
                          iconUrl = item.folder === "Root" 
                            ? `${backendUrl}/colorful-icons/${item.name}.svg?t=${Date.now()}`
                            : `${backendUrl}/colorful-icons/${item.folder}/${item.name}.svg?t=${Date.now()}`;
                        } else {
                          iconUrl = item.folder === "Root" 
                            ? `${backendUrl}/static/${item.name}.svg?t=${Date.now()}`
                            : `${backendUrl}/static-icons/${item.folder}/${item.name}.svg?t=${Date.now()}`;
                        }
                        return (
                          <button
                            key={`${item.name}-${item.folder}`}
                            className={`flex flex-col items-center p-2 rounded-lg border transition w-full h-28 justify-center ${
                              isMultiSelectMode 
                                ? (activeTab === "icons" && selectedIcons && selectedIcons.has(item.name)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item.name))
                                  ? 'bg-blue-600 text-white font-semibold border-blue-600'
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                    : 'hover:bg-blue-100 text-gray-700'
                                : selectedIcon === item.name 
                                  ? 'bg-[#2E5583] text-white font-semibold' 
                                  : darkMode 
                                    ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                                    : 'hover:bg-blue-100 text-gray-700'
                            }`}
                            onClick={() => handleSearchResultClick(item)}
                          >
                            <img
                              src={iconUrl}
                              alt={item.name}
                              className="w-12 h-12 object-contain mb-1"
                              onError={e => e.target.style.display = 'none'}
                            />
                            <span className="text-xs truncate w-full text-center">{item.name}</span>
                            <span className="text-xs opacity-70">({item.folder})</span>
                            {isMultiSelectMode && (
                              <span className="ml-2">
                                {(activeTab === "icons" && selectedIcons && selectedIcons.has(item.name)) || (activeTab === "colorful-icons" && selectedColorfulIcons && selectedColorfulIcons.has(item.name))
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
              
              {/* Flags */}
              {activeTab === "flags" && filteredItems.map(item => (
                <button
                  key={item}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                    isMultiSelectMode 
                      ? selectedFlags && selectedFlags.has(item)
                        ? 'bg-blue-600 text-white font-semibold border-blue-600'
                        : darkMode 
                          ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                          : 'hover:bg-blue-100 text-gray-700'
                      : selectedIcon === item || selectedCountry === item 
                        ? 'bg-[#2E5583] text-white font-semibold' 
                        : darkMode 
                          ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' 
                          : 'hover:bg-blue-100 text-gray-700'
                  }`}
                  onClick={() => handleFlagClick(item)}>
                  <span>{item}</span>
                  {isMultiSelectMode && (
                    <span className="ml-2">
                      {selectedFlags && selectedFlags.has(item) ? '☑️' : '☐'}
                    </span>
                  )}
                </button>
              ))}
              {filteredItems.length === 0 && searchTerm && (
                <div className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  No items found matching "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow rounded-xl w-[450px] flex-shrink-0`}>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>
              {activeTab === "colorful-icons" ? "Colorful Icon Options" : "Color Change"}
            </h3>
            {(selectedIcon || selectedCountry || (isMultiSelectMode && activeTab === "icons" && selectedIcons && selectedIcons.size > 0) || (isMultiSelectMode && activeTab === "flags" && selectedFlags && selectedFlags.size > 0) || (isMultiSelectMode && activeTab === "colorful-icons")) ? (
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
                  {!isMultiSelectMode && (
                    <div className="flex gap-2">
                      <button
                        onClick={exportSvg}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex-1 ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export SVG
                      </button>
                      <button
                        onClick={exportPng}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex-1 ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      >
                        Export PNG
                      </button>
                      <button
                        onClick={handleCopyAsImage}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-pink-100 text-gray-700'}`}
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  )}
                  
                  {/* Multi-select actions for flags */}
                  {isMultiSelectMode && selectedFlags && selectedFlags.size > 0 && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Apply to {selectedFlags.size} selected flags:
                      </h4>
                      <div className="flex gap-2 flex-wrap">
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
                        <button
                          onClick={() => exportAsZip("svg")}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-green-600 text-white hover:bg-green-700' 
                                : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {loading ? 'Exporting...' : 'Export as ZIP (SVG)'}
                        </button>
                        <button
                          onClick={() => exportAsZip("png")}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                : 'bg-purple-500 text-white hover:bg-purple-600'
                          }`}
                        >
                          {loading ? 'Exporting...' : 'Export as ZIP (PNG)'}
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
                      <h4 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
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
                <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
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
                    onChange={handleColorInputChange}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentColor}
                    onChange={handleColorInputChange}
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

            {/* Export Options */}
            {(selectedIcon || (isMultiSelectMode && getSelectedCount && getSelectedCount() > 0)) && activeTab !== "flags" && (
              <div className="mt-6">
                <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
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
                        onClick={() => exportAsZip("svg")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                      >
                        Export as ZIP (SVG)
                      </button>
                      <button
                        onClick={() => exportAsZip("png")}
                        className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'}`}
                      >
                        Export as ZIP (PNG)
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


          </div>

          {/* Right Panel - Preview */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow rounded-xl flex-1`}>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>
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
                              iconUrl = storedFolder === "Root" 
                                ? `${backendUrl}/static/${itemName}.svg?t=${Date.now()}`
                                : `${backendUrl}/static-icons/${storedFolder}/${itemName}.svg?t=${Date.now()}`;
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

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg max-w-md w-full mx-4`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Submit Feedback
              </h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackType("New Addition");
                  setFeedbackMessage("");
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
                  message: feedbackMessage
                });
                
                if (response.data.status === "Feedback submitted successfully") {
                  toast.success("Feedback submitted successfully!");
                  setShowFeedbackModal(false);
                  setFeedbackType("New Addition");
                  setFeedbackMessage("");
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
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 rounded-xl shadow-lg max-w-6xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
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
      {showLlama && (
        <div
          onClick={() => setShowLlama(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer',
          }}
          title="Click to dismiss"
        >
          <img src="/llama.gif" alt="Llama!" style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: '16px', boxShadow: '0 4px 32px #0008' }} />
        </div>
      )}
    </div>
  );
}

export default App;