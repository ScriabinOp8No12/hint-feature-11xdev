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
import { PaginatedTable } from "@/components/PaginatedTable";
import moment from "moment";

export class MerchantLog extends React.PureComponent<{}, any> {
    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div id="MerchantLog">
                <PaginatedTable
                    className="merchantlog"
                    name="merchantlog"
                    source={`supporter_center/merchant_callback_log`}
                    orderBy={["-timestamp"]}
                    columns={[
                        {
                            header: "Time",
                            className: () => "timestamp",
                            render: (X) => moment(new Date(X.timestamp)).format("YYYY-MM-DD HH:mm"),
                        },

                        { header: "System", render: (X) => X.system },
                        {
                            header: "Event",
                            render: (X) => {
                                try {
                                    return JSON.parse(X.request_body).type;
                                } catch {
                                    // ignore error
                                }
                                return "";
                            },
                        },
                        //{header: "URI"        , render: (X) => X.request_uri} ,
                        {
                            header: "Meta",
                            render: (X) => <pre className="meta">{clean_meta(X.request_meta)}</pre>,
                        },
                        {
                            header: "Body",
                            render: (X) => <pre className="body">{clean_body(X.request_body)}</pre>,
                        },
                        { header: "Status", render: (X) => X.response_status_code },
                        {
                            header: "Response",
                            render: (X) => <pre>{clean_body(X.response_body)}</pre>,
                        },
                        {
                            header: "Exception",
                            render: (X) => <pre>{clean_exception(X.exception)}</pre>,
                        },
                    ]}
                />
            </div>
        );
    }
}

function clean_meta(str: string): string {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, Object.keys(obj).sort(), 1);
}
function clean_body(str: string): string {
    let obj: any = str;
    try {
        obj = JSON.parse(str);
        console.log(obj);
    } catch {
        // ignore error
    }

    try {
        if (typeof obj === "string") {
            obj = parseQuery(str);
        }
    } catch {
        // ignore error
    }

    try {
        return orderedJsonStringify(obj);
    } catch {
        // ignore error
    }

    return JSON.stringify(obj, null, 1);
}
function clean_exception(str: string): string {
    return str;
}

function sortObjByKey(value: any): any {
    return typeof value === "object"
        ? Array.isArray(value)
            ? value.map(sortObjByKey)
            : Object.keys(value)
                  .sort()
                  .reduce((o: any, key) => {
                      const v = value[key];
                      o[key] = sortObjByKey(v);
                      return o;
                  }, {})
        : value;
}

function orderedJsonStringify(obj: any) {
    return JSON.stringify(sortObjByKey(obj));
}

function parseQuery(queryString: string) {
    const query: any = {};
    const pairs = (queryString[0] === "?" ? queryString.substr(1) : queryString).split("&");
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split("=");
        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
    }
    return query;
}
