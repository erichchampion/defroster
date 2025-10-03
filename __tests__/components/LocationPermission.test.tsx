import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationPermission from '@/app/components/LocationPermission';
import { I18nProvider } from '@/lib/contexts/I18nContext';

// Helper to render with I18n provider
const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('LocationPermission', () => {
  let mockRequestPermission: jest.Mock;

  beforeEach(() => {
    mockRequestPermission = jest.fn();
  });

  it('should render permission request UI', () => {
    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    expect(screen.getByText(/enable location access/i)).toBeInTheDocument();
    expect(screen.getByText(/needs access to your location/i)).toBeInTheDocument();
  });

  it('should call onRequestPermission when button clicked', async () => {
    mockRequestPermission.mockResolvedValue({
      latitude: 37.7749,
      longitude: -122.4194,
    });

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    const button = screen.getByRole('button', { name: /enable location/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state during permission request', async () => {
    let resolvePermission: (value: any) => void;
    const permissionPromise = new Promise((resolve) => {
      resolvePermission = resolve;
    });

    mockRequestPermission.mockReturnValue(permissionPromise);

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    const button = screen.getByRole('button', { name: /enable location/i });
    fireEvent.click(button);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/getting location/i)).toBeInTheDocument();
    });

    // Resolve the permission
    resolvePermission!({ latitude: 37.7749, longitude: -122.4194 });
  });

  it('should display error when permission is denied', async () => {
    mockRequestPermission.mockResolvedValue(null);

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    const button = screen.getByRole('button', { name: /enable location/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed to get location/i)).toBeInTheDocument();
    });
  });

  it('should display error when permission request throws', async () => {
    mockRequestPermission.mockRejectedValue(new Error('Permission denied'));

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    const button = screen.getByRole('button', { name: /enable location/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });
  });

  it('should allow retry after error', async () => {
    mockRequestPermission
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce({ latitude: 37.7749, longitude: -122.4194 });

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    const button = screen.getByRole('button', { name: /enable location/i });

    // First attempt fails
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });

    // Second attempt succeeds
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(2);
    });
  });
});
