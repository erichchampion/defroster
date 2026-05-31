import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LocationPermission from '@/app/components/LocationPermission';
import { I18nProvider } from '@/lib/contexts/I18nContext';

// Helper to render with I18n provider
const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('LocationPermission (onboarding)', () => {
  let mockRequestPermission: jest.Mock;

  beforeEach(() => {
    mockRequestPermission = jest.fn();
  });

  it('should render the onboarding hero and permission CTA', () => {
    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    expect(screen.getByText(/Know when ICE, the Army, or police are nearby/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /turn on location to begin/i })).toBeInTheDocument();
  });

  it('should invoke onOpenGuide when the rights link is clicked', () => {
    const onOpenGuide = jest.fn();
    renderWithI18n(
      <LocationPermission onRequestPermission={mockRequestPermission} onOpenGuide={onOpenGuide} />
    );

    fireEvent.click(screen.getByRole('button', { name: /know your rights/i }));
    expect(onOpenGuide).toHaveBeenCalledTimes(1);
  });

  it('should call onRequestPermission when button clicked', async () => {
    mockRequestPermission.mockResolvedValue({ latitude: 37.7749, longitude: -122.4194 });

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    fireEvent.click(screen.getByRole('button', { name: /turn on location to begin/i }));

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });
  });

  it('should show loading state during permission request', async () => {
    let resolvePermission: (value: unknown) => void;
    const permissionPromise = new Promise((resolve) => {
      resolvePermission = resolve;
    });
    mockRequestPermission.mockReturnValue(permissionPromise);

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    fireEvent.click(screen.getByRole('button', { name: /turn on location to begin/i }));

    await waitFor(() => {
      expect(screen.getByText(/getting your location/i)).toBeInTheDocument();
    });

    resolvePermission!({ latitude: 37.7749, longitude: -122.4194 });
  });

  it('should display error when permission is denied', async () => {
    mockRequestPermission.mockResolvedValue(null);

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    fireEvent.click(screen.getByRole('button', { name: /turn on location to begin/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to get location/i)).toBeInTheDocument();
    });
  });

  it('should display error when permission request throws', async () => {
    mockRequestPermission.mockRejectedValue(new Error('Permission denied'));

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    fireEvent.click(screen.getByRole('button', { name: /turn on location to begin/i }));

    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });
  });

  it('should allow retry after error', async () => {
    mockRequestPermission
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce({ latitude: 37.7749, longitude: -122.4194 });

    renderWithI18n(<LocationPermission onRequestPermission={mockRequestPermission} />);

    const button = screen.getByRole('button', { name: /turn on location to begin/i });

    fireEvent.click(button);
    await waitFor(() => {
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });

    fireEvent.click(button);
    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(2);
    });
  });
});
