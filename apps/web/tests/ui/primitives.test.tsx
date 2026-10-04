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

  /**
   * The hint used to sit inside the <label>, so a screen reader announced
   * the whole sentence as the field's name. The name is the label alone;
   * the hint and any error are the description.
   */
  it.each([
    ['Input', <Input key="i" label="Tên hiển thị" hint="Tối đa 80 ký tự." />],
    [
      'Select',
      <Select key="s" label="Khu vực" hint="Chỉ hiển thị quận/huyện." defaultValue="">
        <option value="">Chọn khu vực</option>
      </Select>,
    ],
  ])('names a %s by its label and describes it by its hint', (_name, element) => {
    render(element);

    const control = screen.getByRole(_name === 'Input' ? 'textbox' : 'combobox');
    expect(control).toHaveAccessibleName(_name === 'Input' ? 'Tên hiển thị' : 'Khu vực');
    expect(control).toHaveAccessibleDescription(
      _name === 'Input' ? 'Tối đa 80 ký tự.' : 'Chỉ hiển thị quận/huyện.',
    );
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

  it('traps forward and backward Tab navigation inside an open dialog', async () => {
    const user = userEvent.setup();

    render(
      <Dialog
        open
        onOpenChange={() => undefined}
        title="Xác nhận liên hệ"
      >
        <Button>Tiếp tục</Button>
      </Dialog>,
    );

    const closeButton = screen.getByRole('button', { name: 'Đóng hộp thoại' });
    const continueButton = screen.getByRole('button', { name: 'Tiếp tục' });
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(continueButton).toHaveFocus();
    await user.tab();
    expect(closeButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(continueButton).toHaveFocus();
  });

  it('restores focus to the opener when the dialog closes', async () => {
    const user = userEvent.setup();

    function TriggeredExample() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Mở hộp thoại</Button>
          <Dialog open={open} onOpenChange={setOpen} title="Xác nhận liên hệ">
            <Button>Tiếp tục</Button>
          </Dialog>
        </>
      );
    }

    render(<TriggeredExample />);
    const opener = screen.getByRole('button', { name: 'Mở hộp thoại' });
    await user.click(opener);
    expect(screen.getByRole('button', { name: 'Đóng hộp thoại' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
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
