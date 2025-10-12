import { useState, useEffect } from "react";
import { fetchUserById, type UserResponse } from "../helpers/userApi";

interface UserMap {
  [uid: string]: UserResponse;
}

export function useUser(uids: string[]) {
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uids || uids.length === 0) {
      setUsers({});
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    Promise.all(uids.map(uid => fetchUserById(uid)))
      .then(responses => {
        if (!isMounted) return;
        const map: UserMap = {};
        responses.forEach((u, idx) => {
          map[uids[idx]] = {
            ...u,
            fullName: u.fullName || `${u.firstName} ${u.lastName}`,
          };
        });
        setUsers(map);
      })
      .finally(() => isMounted && setLoading(false));

    return () => { isMounted = false; };
  }, [uids]);

  return { users, loading };
}
