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
import { cc_to_country_name, getCountryFlagClass, getLanguageFlag } from "@/lib/translate";

interface FlagProperties {
    country: string;
    user_country?: string;
    language?: string;
    big?: boolean;
}

export function Flag(props: FlagProperties): React.ReactElement {
    if (props.language && props.user_country) {
        return (
            <span style={{ display: "inline-flex" }}>
                <span
                    className={props.big ? "f32" : "f32 flag-small"}
                    title={cc_to_country_name(props.country)}
                >
                    <span
                        className={
                            "flag " +
                            getLanguageFlag(props.language, props.user_country, props.country)
                        }
                    />
                </span>
            </span>
        );
    } else {
        return (
            <span style={{ display: "inline-flex" }}>
                <span
                    className={props.big ? "f32" : "f32 flag-small"}
                    title={cc_to_country_name(props.country)}
                >
                    <span className={"flag " + getCountryFlagClass(props.country)} />
                </span>
            </span>
        );
    }
}
