export const colors = {
  primary: '#00ff96',
  secondary: '#00d4ff',
  background: '#0a0a0a',
  surface: '#0f0f0f',
  surfaceLight: '#1a1a2e',
  surfaceLighter: '#1a2a3a',
  text: '#ffffff',
  textSecondary: '#888888',
  textTertiary: '#666666',
  border: 'rgba(0, 255, 150, 0.2)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  error: '#ff6b6b',
  success: '#00ff96',
  warning: '#ffb946',
  
  gradient: {
    primary: ['#00ff96', '#00d4ff'],
    surface: ['#1a2a3a', '#0f1f2f'],
    button: ['#00ff96', '#00d4ff'],
    header: ['#1a1a2e', '#0a0a0a'],
  },
  
  opacity: {
    overlay: 'rgba(0, 0, 0, 0.9)',
    card: 'rgba(0, 255, 150, 0.05)',
    button: 'rgba(0, 255, 150, 0.1)',
    buttonActive: 'rgba(0, 255, 150, 0.2)',
    border: 'rgba(0, 255, 150, 0.2)',
    input: 'rgba(255, 255, 255, 0.05)',
  },
};

export type Colors = typeof colors;