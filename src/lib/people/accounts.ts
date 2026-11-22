import "server-only";

// Login accounts in Clerk for students, parents and teachers. A plain module,
// not a "use server" file, so none of it can be called from the browser.

export type PersonRole = "student" | "parent" | "teacher";

/** The Clerk user calls this module makes, so tests can pass a fake. */
export type ClerkUsers = {
  createUser(params: {
    username: string;
    password?: string;
    firstName: string;
    publicMetadata: { role: PersonRole };
  }): Promise<{ id: string }>;
  updateUser(
    userId: string,
    params: {
      username: string;
      password?: string;
      firstName: string;
      publicMetadata: { role: PersonRole };
    },
  ): Promise<unknown>;
  deleteUser(userId: string): Promise<unknown>;
};

/**
 * Creates the Clerk account, then saves the database rows with its id. If the
 * rows can't be saved, the account is deleted again, so nobody is left with a
 * login that leads nowhere. The password goes to Clerk only.
 */
export const withNewAccount = async <T>(
  clerk: ClerkUsers,
  account: { username: string; password?: string; name: string; role: PersonRole },
  saveRows: (userId: string) => Promise<T>,
): Promise<{ userId: string; saved: T }> => {
  const user = await clerk.createUser({
    username: account.username,
    password: account.password,
    firstName: account.name,
    publicMetadata: { role: account.role },
  });

  try {
    return { userId: user.id, saved: await saveRows(user.id) };
  } catch (err) {
    try {
      await clerk.deleteUser(user.id);
    } catch {
      // Best effort: the original error is the one worth reporting.
    }
    throw err;
  }
};

/** Updates the Clerk account. A blank password keeps the current one. */
export const updateAccount = (
  clerk: ClerkUsers,
  userId: string,
  account: { username: string; password?: string; name: string; role: PersonRole },
) =>
  clerk.updateUser(userId, {
    username: account.username,
    ...(account.password ? { password: account.password } : {}),
    firstName: account.name,
    publicMetadata: { role: account.role },
  });
