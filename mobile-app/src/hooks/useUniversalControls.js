import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook para detectar teclas WASD o Flechas en navegadores Web.
 * @param {Function} onMove - Función que recibe la dirección ('UP', 'DOWN', 'LEFT', 'RIGHT')
 */
export const useUniversalControls = (onMove) => {
  useEffect(() => {
    // Solo ejecutamos este código si estamos en un entorno Web
    if (Platform.OS === 'web') {
      const handleKeyDown = (e) => {
        switch (e.key.toLowerCase()) {
          case 'w':
          case 'arrowup':
            onMove('UP');
            break;
          case 's':
          case 'arrowdown':
            onMove('DOWN');
            break;
          case 'a':
          case 'arrowleft':
            onMove('LEFT');
            break;
          case 'd':
          case 'arrowright':
            onMove('RIGHT');
            break;
        }
      };

      // Agregamos el listener a la ventana global
      window.addEventListener('keydown', handleKeyDown);
      
      // Limpiamos el listener al desmontar el componente
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [onMove]);
};
