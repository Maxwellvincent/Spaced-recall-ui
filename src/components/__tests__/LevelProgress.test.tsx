import { render, screen } from '@testing-library/react';
import LevelProgress from '../LevelProgress';

// Mock the next/image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    return <img {...props} />;
  },
}));

describe('LevelProgress', () => {
  const defaultProps = {
    theme: 'Classic',
    xp: 1500,
    level: 3,
  };

  it('renders with default props', () => {
    render(<LevelProgress {...defaultProps} />);
    
    // Check if level is displayed
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Check if XP counter is displayed
    expect(screen.getByText(/1500/)).toBeInTheDocument();
    
    // Check if avatar is displayed by default
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('hides avatar when showAvatar is false', () => {
    render(<LevelProgress {...defaultProps} showAvatar={false} />);
    
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = render(<LevelProgress {...defaultProps} size="sm" />);
    let container = screen.getByText('3').closest('div');
    expect(container).toHaveClass('text-sm');

    rerender(<LevelProgress {...defaultProps} size="lg" />);
    container = screen.getByText('3').closest('div');
    expect(container).toHaveClass('text-lg');
  });

  it('displays progress percentage', () => {
    render(<LevelProgress {...defaultProps} />);
    
    // The actual percentage will depend on the theme configuration
    // We just check if any percentage is displayed
    expect(screen.getByText(/%$/)).toBeInTheDocument();
  });

  it('applies theme-specific classes', () => {
    const { container } = render(<LevelProgress {...defaultProps} theme="Nature" />);
    
    // Check if theme classes are applied to the progress bar
    const progressBar = container.querySelector('[class*="bg-"]');
    expect(progressBar).toBeInTheDocument();
  });
}); 