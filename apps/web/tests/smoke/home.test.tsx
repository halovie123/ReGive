import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home', () => {
  it('introduces the public ReGive experience', () => {
    render(<Home />);

    expect(
      screen.getByRole('heading', {
        name: 'Chia sẻ món đồ cũ, trao thêm một niềm vui',
      }),
    ).toBeInTheDocument();
  });
});
