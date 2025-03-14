import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavbarVisibilityContextType {
  isNavbarVisible: boolean;
  hideNavbar: () => void;
  showNavbar: () => void;
}

const NavbarVisibilityContext = createContext<NavbarVisibilityContextType | undefined>(undefined);

export function NavbarVisibilityProvider({ children }: { children: ReactNode }) {
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);

  const hideNavbar = () => {
    setIsNavbarVisible(false);
  };

  const showNavbar = () => {
    setIsNavbarVisible(true);
  };

  return (
    <NavbarVisibilityContext.Provider value={{ isNavbarVisible, hideNavbar, showNavbar }}>
      {children}
    </NavbarVisibilityContext.Provider>
  );
}

export function useNavbarVisibility() {
  const context = useContext(NavbarVisibilityContext);
  if (context === undefined) {
    throw new Error('useNavbarVisibility must be used within a NavbarVisibilityProvider');
  }
  return context;
} 