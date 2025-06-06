/*
 * Copyright (C)  Online-Go.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from "react";
import { Player } from "@/components/Player";
import { _ } from "@/lib/translate";
import moment from "moment";
import { PaginatedTable } from "@/components/PaginatedTable";
import * as data from "@/lib/data";
//import { alert } from "@/lib/swal_config";

export function AppealsCenter(): React.ReactElement | null {
    const user = data.get("user");
    const [show_all, set_show_all] = React.useState(false);

    if (!user.is_moderator) {
        return null;
    }

    return (
        <div id="AppealsCenter">
            <h1>
                Appeals Center
                <span>
                    <label htmlFor="show_all">Show all</label>
                    <input
                        type="checkbox"
                        id="show_all"
                        checked={show_all}
                        onChange={(e) => set_show_all(e.target.checked)}
                    />
                </span>
            </h1>
            <PaginatedTable
                className="appeals"
                name="appeals"
                source={`appeals`}
                filter={show_all ? {} : { state: "awaiting_moderator_response" }}
                orderBy={["-updated"]}
                onRowClick={(X, ev) => {
                    const target = ev.target as HTMLElement;
                    // Don't navigate if clicking on Player component
                    if (!target.closest(".Player")) {
                        window.location.href = `/appeal/${X.banned_user.id}`;
                    }
                }}
                columns={[
                    {
                        header: _("Updated"),
                        className: () => "updated",
                        render: (X) => moment(new Date(X.updated)).format("YYYY-MM-DD HH:mm"),
                    },
                    {
                        header: _("Player"),
                        className: () => "state",
                        render: (X) => <Player user={X.banned_user} />,
                    },
                    {
                        header: _("State"),
                        className: () => "state",
                        render: (X) => X.state,
                    },
                    {
                        header: _("Messages"),
                        className: () => "message_count",
                        render: (X) => X.message_count,
                    },
                    {
                        header: _("Ban Expiration"),
                        className: () => "ban_expiration",
                        render: (X) => X.ban_expiration && moment(X.ban_expiration).fromNow(),
                    },
                ]}
            />
        </div>
    );
}
