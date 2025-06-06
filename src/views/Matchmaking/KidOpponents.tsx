/*
 * Copyright (C) 2012-2022  Online-Go.com
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
import { chat_manager, ChatChannelProxy } from "@/lib/chat_manager";
import { useUser } from "@/lib/hooks";
import { Avatar, uiClassToRaceIdx } from "@kidsgo/components/Avatar";
//import { getUserRating } from "rank_utils";

interface OpponentListProperties {
    channel: string;
    value: string;
    handicap: number;
    onChange: (user: string, handicap: number, full_user: any) => void;
}

window["chat_manager"] = chat_manager;

export function KidOpponents(props: OpponentListProperties): JSX.Element {
    const user = useUser();
    const [, refresh] = React.useState<number>(0);
    const proxy = React.useRef<ChatChannelProxy>();

    React.useEffect(() => {
        proxy.current = chat_manager.join(props.channel);
        proxy.current.on("join", () => refresh(Math.random()));
        proxy.current.on("part", () => refresh(Math.random()));
        window["proxy"] = proxy.current;
        refresh(proxy.current.channel.users_by_name.length);

        return () => {
            proxy.current.part();
        };
    }, [props.channel, user.username, user.ui_class]);

    const sorted_users: Array<any> = proxy.current?.channel.users_by_name || [];

    /* to quickly test scrolling we can use this:
    if (sorted_users.length > 0) {
        while (sorted_users.length < 30) {
            sorted_users.push(sorted_users[0]);
        }
    }
    */

    return (
        <div className="OpponentList-container">
            <div className="OpponentList">
                <h4>Kids to Play</h4>
                {sorted_users
                    .filter((u) => u.id !== user.id && u.id > 0)
                    .map((user) => {
                        const [race, idx] = uiClassToRaceIdx(user.ui_class);

                        return (
                            <span
                                key={user.id}
                                className={"kid" + (props.value === user.id ? " active" : "")}
                                onClick={() => props.onChange(user.id, 0, user)}
                            >
                                <Avatar race={race} idx={idx} />
                                {user.username}
                            </span>
                        );
                    })}
            </div>
        </div>
    );
}
