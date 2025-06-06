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
import * as preferences from "@/lib/preferences";
import { createGoban, GobanRenderer } from "goban";
import { sfx } from "@/lib/sfx";
import { PersistentElement } from "@/components/PersistentElement";

interface InstructionalGobanProps {
    width?: number;
    height?: number;
    displayWidth?: number;
    onUpdate?: () => void;
    onSetStoneRemoval?: (obj: any) => void;
    config: any;
}

export class InstructionalGoban extends React.Component<InstructionalGobanProps> {
    goban_div: HTMLDivElement;
    goban?: GobanRenderer;

    constructor(props: InstructionalGobanProps) {
        super(props);
        // TODO: Remove this (state unused)
        this.state = {};

        this.goban_div = document.createElement("div");
        this.goban_div.className = "Goban";
    }

    componentDidMount() {
        this.initialize();
    }
    componentWillUnmount() {
        this.destroy();
    }
    componentDidUpdate(prev_props: InstructionalGobanProps) {
        if (prev_props.config !== this.props.config) {
            this.destroy();
            this.initialize();
        }
    }

    reset() {
        this.destroy();
        this.initialize();
    }

    initialize() {
        this.goban = createGoban(
            {
                board_div: this.goban_div,
                initial_player: "black",
                player_id: 0,
                interactive: true,
                draw_top_labels: this.props.config.draw_top_labels ?? false,
                draw_bottom_labels: this.props.config.draw_bottom_labels ?? false,
                draw_left_labels: this.props.config.draw_left_labels ?? false,
                draw_right_labels: this.props.config.draw_right_labels ?? false,
                bounds: this.props.config.bounds,
                display_width:
                    this.props.displayWidth ||
                    Math.min(
                        document.body.offsetWidth - 50,
                        (document.getElementById("em10")?.offsetWidth ?? 0) * 2,
                    ),
                square_size: "auto",

                puzzle_opponent_move_mode: "automatic",
                puzzle_player_move_mode: "free",
                stone_font_scale: preferences.get("stone-font-scale"),

                getPuzzlePlacementSetting: () => {
                    return { mode: "play" };
                },

                width: this.props.config ? this.props.config.width : 9,
                height: this.props.config ? this.props.config.height : 9,
            },
            this.props.config,
        );
        window.goban = this.goban;

        this.goban.setMode(this.props.config.mode || "puzzle");
        if (this.props.config.engine_phase) {
            this.goban.engine.phase = this.props.config.engine_phase;
        }
        this.goban.on("update", () => {
            if (this.props.onUpdate) {
                this.props.onUpdate();
            }
        });

        this.goban.on(
            "puzzle-place",
            (o: {
                x: number;
                y: number;
                width: number;
                height: number;
                color: "black" | "white";
            }) => {
                sfx.playStonePlacementSound(o.x, o.y, o.width, o.height, o.color);
            },
        );
        this.goban.on("set-for-removal", (obj: any) => {
            if (this.props.config.onSetStoneRemoval) {
                this.props.config.onSetStoneRemoval(obj);
            }
        });
        if (this.props.config["onCorrectAnswer"]) {
            this.goban.on("puzzle-correct-answer", this.props.config.onCorrectAnswer);
        }
        if (this.props.config["onWrongAnswer"]) {
            this.goban.on("puzzle-wrong-answer", this.props.config.onWrongAnswer);
        }
        if (this.props.config["onError"]) {
            this.goban.on("error", this.props.config.onError);
        }
    }
    destroy() {
        if (this.goban) {
            this.goban.destroy();
        }
    }
    render() {
        return (
            <div className="InstructionalGoban">
                <div className="goban-container">
                    <PersistentElement elt={this.goban_div} />
                </div>
            </div>
        );
    }
}
