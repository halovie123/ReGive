import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StatusState } from '@/components/ui/status-state';

describe('UI primitives', () => {
  it('keeps form controls associated with their accessible labels', () => {
    render(
      <>
        <Input label="Tên hiển thị" />
        <Select label="Khu vực" defaultValue="">
          <option value="" disabled>Chọn khu vực</option>
          <option value="hoc-mon">Hóc Môn</option>
        </Select>
      </>,
    );

    expect(screen.getByLabelText('Tên hiển thị')).toBeVisible();
    expect(screen.getByLabelText('Khu vực')).toBeVisible();
  });

  it('closes an open dialog with the Escape key', async () => {
    const user = userEvent.setup();

    function Example() {
      const [open, setOpen] = useState(true);
      return (
        <Dialog
          open={open}
          onOpenChange={setOpen}
          title="Xác nhận liên hệ"
          description="Bạn có muốn bắt đầu trò chuyện?"
        >
          <Button>Tiếp tục</Button>
        </Dialog>
      );
    }

    render(<Example />);
    expect(screen.getByRole('dialog', { name: 'Xác nhận liên hệ' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([
    ['loading', 'Đang tải nội dung'],
    ['empty', 'Chưa có món đồ nào'],
    ['error', 'Không thể tải dữ liệu'],
  ] as const)('announces the %s state', (state, message) => {
    render(<StatusState state={state} message={message} />);
    expect(screen.getByText(message)).toBeVisible();
  });
});
