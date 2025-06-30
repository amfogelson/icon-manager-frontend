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
  const [selectedIcons, setSelectedIcons] = useState(new Set()); // Multi-select for icons
  const [selectedColorfulIcons, setSelectedColorfulIcons] = useState(new Set()); // Multi-select for colorful icons
  const [selectedFlags, setSelectedFlags] = useState(new Set()); // Multi-select for flags
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false); // Toggle multi-select mode

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

  // Multi-select functions
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    // Clear selections when exiting multi-select mode
    if (isMultiSelectMode) {
      setSelectedIcons(new Set());
      setSelectedColorfulIcons(new Set());
      setSelectedFlags(new Set());
    }
  };

  const toggleIconSelection = (iconName) => {
    if (!isMultiSelectMode) return;
    
    if (activeTab === "icons") {
      setSelectedIcons(prev => {
        const newSet = new Set(prev);
        if (newSet.has(iconName)) {
          newSet.delete(iconName);
        } else {
          newSet.add(iconName);
        }
        return newSet;
      });
    } else if (activeTab === "colorful-icons") {
      setSelectedColorfulIcons(prev => {
        const newSet = new Set(prev);
        if (newSet.has(iconName)) {
          newSet.delete(iconName);
        } else {
          newSet.add(iconName);
        }
        return newSet;
      });
    } else if (activeTab === "flags") {
      setSelectedFlags(prev => {
        const newSet = new Set(prev);
        if (newSet.has(iconName)) {
          newSet.delete(iconName);
        } else {
          newSet.add(iconName);
        }
        return newSet;
      });
    }
  };

  const getSelectedCount = () => {
    if (activeTab === "icons") return selectedIcons.size;
    if (activeTab === "colorful-icons") return selectedColorfulIcons.size;
    if (activeTab === "flags") return selectedFlags.size;
    return 0;
  };

  const applyColorToMultipleIcons = async (groupName, color) => {
    if (activeTab !== "icons") return;
    
    const selectedIconList = Array.from(selectedIcons);
    if (selectedIconList.length === 0) return;
    
    try {
      setLoading(true);
      const folderPath = currentFolder || "Root";
      
      // Apply color to all selected icons
      const promises = selectedIconList.map(iconName => 
        axios.post(`${backendUrl}/update_color`, {
          icon_name: iconName + ".svg",
          group_id: groupName,
          color: color,
          type: "icon",
          folder: folderPath
        })
      );
      
      await Promise.all(promises);
      
      // Refresh the current SVG if it's one of the selected icons
      if (selectedIcon && selectedIcons.has(selectedIcon)) {
        const svgUrlToSet = folderPath === "Root" 
          ? `${backendUrl}/static/${selectedIcon}.svg?t=${Date.now()}`
          : `${backendUrl}/static-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`;
        setSvgUrl(svgUrlToSet);
      }
      
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
      const folderPath = currentFolder || "Root";
      
      // Convert all selected icons to greyscale
      const promises = selectedIconList.map(iconName => 
        axios.post(`${backendUrl}/greyscale`, {
          icon_name: iconName,
          folder: folderPath
        })
      );
      
      await Promise.all(promises);
      
      // Refresh the current SVG if it's one of the selected icons
      if (selectedIcon && selectedColorfulIcons.has(selectedIcon)) {
        const svgUrlToSet = folderPath === "Root" 
          ? `${backendUrl}/colorful-icons/${selectedIcon}.svg?t=${Date.now()}`
          : `${backendUrl}/colorful-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`;
        setSvgUrl(svgUrlToSet);
      }
      
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
      const folderPath = currentFolder || "Root";
      
      // Revert all selected icons to original colors
      const promises = selectedIconList.map(iconName => 
        axios.post(`${backendUrl}/revert`, {
          icon_name: iconName,
          folder: folderPath
        })
      );
      
      await Promise.all(promises);
      
      // Refresh the current SVG if it's one of the selected icons
      if (selectedIcon && selectedColorfulIcons.has(selectedIcon)) {
        const svgUrlToSet = folderPath === "Root" 
          ? `${backendUrl}/colorful-icons/${selectedIcon}.svg?t=${Date.now()}`
          : `${backendUrl}/colorful-icons/${folderPath}/${selectedIcon}.svg?t=${Date.now()}`;
        setSvgUrl(svgUrlToSet);
      }
      
      toast.success(`Reverted ${selectedIconList.length} icons to original colors!`);
    } catch (error) {
      console.error('Error reverting multiple icons to color:', error);
      toast.error("Failed to revert some icons to original colors");
    } finally {
      setLoading(false);
    }
  };

  const handleIconClick = (iconName) => {
    if (isMultiSelectMode) {
      toggleIconSelection(iconName);
      return;
    }
    
    setSelectedIcon(iconName);
    const folderPath = currentFolder || "Root";
    const svgUrlToSet = folderPath === "Root" 
      ? `${backendUrl}/static/${iconName}.svg`
      : `${backendUrl}/static-icons/${folderPath}/${iconName}.svg`;
    setSvgUrl(svgUrlToSet);
    loadGroups(iconName, folderPath);
  };

  const handleColorfulIconClick = (iconName) => {
    if (isMultiSelectMode) {
      toggleIconSelection(iconName);
      return;
    }
    
    setSelectedIcon(iconName);
    const folderPath = currentFolder || "Root";
    const svgUrlToSet = folderPath === "Root" 
      ? `${backendUrl}/colorful-icons/${iconName}.svg`
      : `${backendUrl}/colorful-icons/${folderPath}/${iconName}.svg`;
    setSvgUrl(svgUrlToSet);
  };

  const handleFlagClick = (flagName) => {
    if (isMultiSelectMode) {
      toggleIconSelection(flagName);
      return;
    }
    
    setSelectedIcon(flagName);
    const svgUrlToSet = `${backendUrl}/flags/${flagName}.svg`;
    setSvgUrl(svgUrlToSet);
    loadGroups(flagName, "flags");
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
      svgUrlToSet = result.folder === "Root" 
        ? `${backendUrl}/static/${result.name}.svg`
        : `${backendUrl}/static-icons/${result.folder}/${result.name}.svg`;
      loadGroups(result.name, result.folder);
    } else if (result.type === 'colorful-icon') {
      svgUrlToSet = result.folder === "Root" 
        ? `${backendUrl}/colorful-icons/${result.name}.svg`
        : `${backendUrl}/colorful-icons/${result.folder}/${result.name}.svg`;
    } else if (result.type === 'flag') {
      svgUrlToSet = `${backendUrl}/flags/${result.name}.svg`;
      loadGroups(result.name, "flags");
    }
    
    setSvgUrl(svgUrlToSet);
    setSearchTerm('');
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-10 rounded-xl shadow-lg max-w-6xl mx-auto mb-8`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Icon Manager
              </h1>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-slate-400'}`}>Manage and customize your icons</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-lg transition ${darkMode ? 'bg-[#2E5583] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                
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
                {isMultiSelectMode && getSelectedCount() > 0 && (
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
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                    isMultiSelectMode && selectedIcons.has(item.name)
                      ? 'bg-blue-600 text-white font-semibold border-blue-600'
                      : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'
                  }`}
                  onClick={() => handleSearchResultClick(item)}>
                  <span>🔍 {item.name} <span className="text-xs opacity-70">({item.folder})</span></span>
                  {isMultiSelectMode && (
                    <span className="ml-2">
                      {selectedIcons.has(item.name) ? '☑️' : '☐'}
                    </span>
                  )}
                </button>
              ))}
              {activeTab === "colorful-icons" && !currentFolder && searchTerm && filteredItems.map(item => (
                <button
                  key={`${item.folder}-${item.name}`}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                    isMultiSelectMode && selectedColorfulIcons.has(item.name)
                      ? 'bg-blue-600 text-white font-semibold border-blue-600'
                      : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-blue-100 text-gray-700'
                  }`}
                  onClick={() => handleSearchResultClick(item)}>
                  <span>🎨 {item.name} <span className="text-xs opacity-70">({item.folder})</span></span>
                  {isMultiSelectMode && (
                    <span className="ml-2">
                      {selectedColorfulIcons.has(item.name) ? '☑️' : '☐'}
                    </span>
                  )}
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
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                        isMultiSelectMode 
                          ? (activeTab === "icons" && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons.has(item))
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
                          {(activeTab === "icons" && selectedIcons.has(item)) || (activeTab === "colorful-icons" && selectedColorfulIcons.has(item))
                            ? '☑️'
                            : '☐'
                          }
                        </span>
                      )}
                    </button>
                  ))}
                </>
              )}
              {activeTab === "flags" && getCountryNames().map(item => (
                <button
                  key={item}
                  className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left flex items-center justify-between ${
                    isMultiSelectMode 
                      ? selectedFlags.has(item)
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
                      {selectedFlags.has(item) ? '☑️' : '☐'}
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
                  
                  {/* Multi-select actions for colorful icons */}
                  {isMultiSelectMode && selectedColorfulIcons.size > 0 && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Apply to {selectedColorfulIcons.size} selected icons:
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={convertMultipleToGreyscale}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
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
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
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
                  {groups.map((group, idx) => (
                    <button
                      key={idx}
                      className={`px-4 py-2 rounded-lg transition border border-gray-500 text-left ${selectedGroup === group ? 'bg-green-600 text-white font-semibold' : darkMode ? 'hover:bg-[#2E5583] text-white bg-[#1a365d]' : 'hover:bg-green-100 text-gray-700'}`}
                      onClick={() => handleGroupClick(group)}>
                      {group}
                    </button>
                  ))}
                  
                  {/* Multi-select actions for icons */}
                  {isMultiSelectMode && selectedIcons.size > 0 && (
                    <div className={`p-4 rounded-lg border-2 border-blue-500 ${darkMode ? 'bg-[#1a365d]' : 'bg-blue-50'}`}>
                      <h4 className={`text-md font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Apply to {selectedIcons.size} selected icons:
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyColorToMultipleIcons("Grey", "#808080")}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-gray-600 text-white hover:bg-gray-700' 
                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                        >
                          {loading ? 'Applying...' : 'Apply Grey'}
                        </button>
                        <button
                          onClick={() => applyColorToMultipleIcons("Color", "#000000")}
                          disabled={loading}
                          className={`px-4 py-2 rounded-lg transition ${
                            loading 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : darkMode 
                                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {loading ? 'Applying...' : 'Apply Color'}
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
            {selectedGroup && activeTab === "icons" && (
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
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={currentColor}
                    onChange={(e) => setCurrentColor(e.target.value)}
                    className={`flex-1 px-3 py-2 border border-gray-300 rounded ${darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900'}`}
                    placeholder="#000000"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => applyColorChange(currentColor)}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg transition ${
                      loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : darkMode 
                          ? 'bg-blue-600 text-white hover:bg-blue-700' 
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {loading ? "Applying..." : "Apply Color"}
                  </button>
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
                </div>
              </div>
            )}

            {/* Export Options */}
            {selectedIcon && activeTab !== "flags" && (
              <div className="mt-6">
                <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Export Options
                </h4>
                <div className="flex gap-2">
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
              </div>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 shadow rounded-xl flex-1`}>
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>
              Preview
            </h3>
            {svgUrl ? (
              <div className="flex items-center justify-center h-64 rounded-lg">
                <img
                  src={svgUrl}
                  alt="Icon Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className={`flex items-center justify-center h-64 rounded-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Select an icon to preview
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;