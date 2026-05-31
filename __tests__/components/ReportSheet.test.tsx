import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportSheet from '@/app/components/ReportSheet';
import { I18nProvider } from '@/lib/contexts/I18nContext';

const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('ReportSheet', () => {
  const mockCurrentLocation = { latitude: 37.7749, longitude: -122.4194 };
  let mockOnSendMessage: jest.Mock;
  let mockOnClose: jest.Mock;

  beforeEach(() => {
    mockOnSendMessage = jest.fn().mockResolvedValue(undefined);
    mockOnClose = jest.fn();
  });

  const renderSheet = () =>
    renderWithI18n(
      <ReportSheet
        onSendMessage={mockOnSendMessage}
        currentLocation={mockCurrentLocation}
        onClose={mockOnClose}
      />
    );

  describe('Sighting Type Selection', () => {
    it('should default to ICE sighting type', () => {
      renderSheet();
      const iceCard = screen.getByRole('radio', { name: /Immigration & Customs Enforcement/i });
      expect(iceCard).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow switching to Army sighting type', () => {
      renderSheet();
      const armyCard = screen.getByRole('radio', { name: /Army or National Guard/i });
      fireEvent.click(armyCard);
      expect(armyCard).toHaveAttribute('aria-checked', 'true');
    });

    it('should allow switching to Police sighting type', () => {
      renderSheet();
      const policeCard = screen.getByRole('radio', { name: /Local or state police/i });
      fireEvent.click(policeCard);
      expect(policeCard).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Report Sighting', () => {
    it('should send ICE sighting when send is clicked', async () => {
      renderSheet();
      fireEvent.click(screen.getByRole('button', { name: /send anonymous alert/i }));
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('ICE', mockCurrentLocation);
      });
    });

    it('should send Army sighting when selected', async () => {
      renderSheet();
      fireEvent.click(screen.getByRole('radio', { name: /Army or National Guard/i }));
      fireEvent.click(screen.getByRole('button', { name: /send anonymous alert/i }));
      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Army', mockCurrentLocation);
      });
    });

    it('should show a success state after sending', async () => {
      renderSheet();
      fireEvent.click(screen.getByRole('button', { name: /send anonymous alert/i }));
      await waitFor(() => {
        expect(screen.getByText(/alert sent/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during send', async () => {
      let resolveSend: () => void;
      const sendPromise = new Promise<void>((resolve) => {
        resolveSend = resolve;
      });
      mockOnSendMessage.mockReturnValue(sendPromise);

      renderSheet();
      const sendButton = screen.getByRole('button', { name: /send anonymous alert/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
        expect(sendButton).toBeDisabled();
      });

      resolveSend!();
    });
  });

  describe('Closing', () => {
    it('should call onClose when the close button is clicked', () => {
      renderSheet();
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose on Escape', () => {
      renderSheet();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose from the success state', async () => {
      renderSheet();
      fireEvent.click(screen.getByRole('button', { name: /send anonymous alert/i }));
      await waitFor(() => {
        expect(screen.getByText(/alert sent/i)).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /done/i }));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});
