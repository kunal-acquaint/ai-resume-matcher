import type { User } from '@resume-matcher/shared';
import { screen, waitFor, within } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import * as authApi from '@/features/auth/auth-api';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { ApiError } from '@/lib/api/api-error';
import { ME } from '@/test/fixtures';
import { renderRoutes } from '@/test/render';
import * as usersApi from './users-api';
import { UsersPage } from './UsersPage';

vi.mock('./users-api');
vi.mock('@/features/auth/auth-api');

const BOB: User = {
  ...ME,
  id: 'u-bob',
  name: 'Bob Builder',
  email: 'bob@example.com',
  lastLoginAt: null,
};

const routes: RouteObject[] = [
  { path: '/users', element: <UsersPage /> },
  { path: '/profile', element: <ProfilePage /> },
];

describe('UsersPage', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(ME);
    vi.mocked(usersApi.listUsers).mockResolvedValue([ME, BOB]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('marks your own row and disables actions on it', async () => {
    renderRoutes(routes, '/users');

    const myRow = (await screen.findByText('You')).closest('tr') as HTMLElement;
    expect(within(myRow).getByRole('button', { name: `Remove ${ME.name}` })).toBeDisabled();
    expect(
      within(myRow).getByRole('button', { name: `Reset password for ${ME.name}` }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: `Remove ${BOB.name}` })).toBeEnabled();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('adds an admin after validating the form', async () => {
    vi.mocked(usersApi.createUser).mockResolvedValue({ ...BOB, id: 'u-new', name: 'Carol' });
    const { user } = renderRoutes(routes, '/users');

    await user.click(await screen.findByRole('button', { name: 'Add admin' }));
    const dialog = screen.getByRole('dialog', { name: 'Add admin' });
    await user.type(within(dialog).getByLabelText('Name'), 'Carol');
    await user.type(within(dialog).getByLabelText('Email'), 'carol@example.com');
    await user.type(within(dialog).getByLabelText('Initial password'), 'carol-password');
    await user.type(within(dialog).getByLabelText('Confirm password'), 'different-password');
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));

    expect(await within(dialog).findByText('The passwords don’t match')).toBeInTheDocument();
    expect(usersApi.createUser).not.toHaveBeenCalled();

    await user.clear(within(dialog).getByLabelText('Confirm password'));
    await user.type(within(dialog).getByLabelText('Confirm password'), 'carol-password');
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));

    await waitFor(() =>
      expect(vi.mocked(usersApi.createUser).mock.calls[0]?.[0]).toEqual({
        name: 'Carol',
        email: 'carol@example.com',
        password: 'carol-password',
      }),
    );
  });

  it('shows the API error when the email is already used', async () => {
    vi.mocked(usersApi.createUser).mockRejectedValue(
      new ApiError(409, 'An admin with this email already exists'),
    );
    const { user } = renderRoutes(routes, '/users');

    await user.click(await screen.findByRole('button', { name: 'Add admin' }));
    const dialog = screen.getByRole('dialog', { name: 'Add admin' });
    await user.type(within(dialog).getByLabelText('Name'), 'Bob Again');
    await user.type(within(dialog).getByLabelText('Email'), BOB.email);
    await user.type(within(dialog).getByLabelText('Initial password'), 'bob-password');
    await user.type(within(dialog).getByLabelText('Confirm password'), 'bob-password');
    await user.click(within(dialog).getByRole('button', { name: 'Add admin' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');
  });

  it('removes another admin after confirmation', async () => {
    vi.mocked(usersApi.deleteUser).mockResolvedValue();
    const { user } = renderRoutes(routes, '/users');

    await user.click(await screen.findByRole('button', { name: `Remove ${BOB.name}` }));
    const dialog = screen.getByRole('dialog', { name: 'Remove admin?' });
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(usersApi.deleteUser).toHaveBeenCalledWith(BOB.id));
  });
});

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(ME);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the account details', async () => {
    renderRoutes(routes, '/profile');

    expect(await screen.findByText(ME.email)).toBeInTheDocument();
    expect(screen.getByText(ME.name)).toBeInTheDocument();
  });

  it('changes the password and clears the form', async () => {
    vi.mocked(authApi.changePassword).mockResolvedValue();
    const { user } = renderRoutes(routes, '/profile');

    await user.type(await screen.findByLabelText('Current password'), 'old-password');
    await user.type(screen.getByLabelText('New password'), 'new-password-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() =>
      expect(vi.mocked(authApi.changePassword).mock.calls[0]?.[0]).toEqual({
        currentPassword: 'old-password',
        newPassword: 'new-password-1',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('Current password')).toHaveValue(''));
  });

  it('shows the API error for a wrong current password', async () => {
    vi.mocked(authApi.changePassword).mockRejectedValue(
      new ApiError(400, 'Current password is incorrect'),
    );
    const { user } = renderRoutes(routes, '/profile');

    await user.type(await screen.findByLabelText('Current password'), 'wrong-password');
    await user.type(screen.getByLabelText('New password'), 'new-password-1');
    await user.type(screen.getByLabelText('Confirm new password'), 'new-password-1');
    await user.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
  });
});
