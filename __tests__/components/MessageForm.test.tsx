import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MessageForm from '@/app/components/MessageForm';
import { I18nProvider } from '@/lib/contexts/I18nContext';

// Helper to render with I18n provider
const renderWithI18n = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

describe('MessageForm', () => {
  const mockCurrentLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  let mockOnSendMessage: jest.Mock;

  beforeEach(() => {
    mockOnSendMessage = jest.fn().mockResolvedValue(undefined);
  });

  describe('Sighting Type Selection', () => {
    it('should default to ICE sighting type', () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const iceRadio = screen.getByRole('radio', { name: /ICE \(Immigration/i }) as HTMLInputElement;
      expect(iceRadio.checked).toBe(true);
    });

    it('should allow switching to Army sighting type', () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const armyRadio = screen.getByRole('radio', { name: /^Army$/i });
      fireEvent.click(armyRadio);

      expect((armyRadio as HTMLInputElement).checked).toBe(true);
    });

    it('should allow switching to Police sighting type', () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const policeRadio = screen.getByRole('radio', { name: /^Police$/i });
      fireEvent.click(policeRadio);

      expect((policeRadio as HTMLInputElement).checked).toBe(true);
    });
  });

  describe('Report Sighting', () => {
    it('should send ICE sighting when form submitted', async () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const submitButton = screen.getByRole('button', { name: /report sighting/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('ICE', mockCurrentLocation);
      });
    });

    it('should send Army sighting when form submitted', async () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const armyRadio = screen.getByRole('radio', { name: /^Army$/i });
      fireEvent.click(armyRadio);

      const submitButton = screen.getByRole('button', { name: /report sighting/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Army', mockCurrentLocation);
      });
    });

    it('should send Police sighting when form submitted', async () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const policeRadio = screen.getByRole('radio', { name: /^Police$/i });
      fireEvent.click(policeRadio);

      const submitButton = screen.getByRole('button', { name: /report sighting/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Police', mockCurrentLocation);
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

      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const submitButton = screen.getByRole('button', { name: /report sighting/i });
      fireEvent.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });

      // Resolve the send
      resolveSend!();
    });

    it('should re-enable submit after send completes', async () => {
      renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const submitButton = screen.getByRole('button', { name: /report sighting/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalled();
      });

      // Button should be enabled again after send
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should maintain form functionality after send completes', async () => {
      // Test that form can be used multiple times
      const { rerender } = renderWithI18n(
        <MessageForm
          onSendMessage={mockOnSendMessage}
          currentLocation={mockCurrentLocation}
        />
      );

      const submitButton = screen.getByRole('button', { name: /report sighting/i });

      // First submission
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Second submission should work
      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });

      // Verify mock was called twice
      expect(mockOnSendMessage).toHaveBeenCalledTimes(2);
    });
  });
});
