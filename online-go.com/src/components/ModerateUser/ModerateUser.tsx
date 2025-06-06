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
import * as data from "@/lib/data";
import { _, pgettext } from "@/lib/translate";
import { put, get, del } from "@/lib/requests";
import { errorAlerter } from "@/lib/misc";
import { proRankList } from "@/lib/rank_utils";
import { Modal, openModal } from "@/components/Modal";
import { PlayerCacheEntry, lookup } from "@/lib/player_cache";
import { MODERATOR_POWERS } from "@/lib/moderation";

interface Events {}

interface ModerateUserProperties {
    playerId?: number;
}

import { alert } from "@/lib/swal_config";
import { ModerationOfferControl } from "@/components/ModerationOfferControl";

const pro_ranks = proRankList(false);

export class ModerateUser extends Modal<Events, ModerateUserProperties, any> {
    constructor(props: ModerateUserProperties) {
        super(props);
        this.state = {
            loading: true,
            username: "...",
        };
    }

    componentDidMount() {
        get(`players/${this.props.playerId}/full`)
            .then((result) => {
                console.log(result);
                this.setState(
                    Object.assign({ loading: false }, result.user, {
                        bot_owner: result.user.bot_owner ? result.user.bot_owner.id : null,
                    }),
                );
            })
            .catch(errorAlerter);
    }

    save = () => {
        void alert
            .fire({
                text: _("Moderator note"),
                input: "text",
                showCancelButton: true,
            })
            .then(({ value: reason, isConfirmed }) => {
                if (!isConfirmed) {
                    return;
                }

                this.close();

                const fields = [
                    "is_bot",
                    //"is_banned",
                    "is_shadowbanned",
                    "bot_owner",
                    "bot_ai",
                    "username",
                    "supporter",
                    "username",
                    "password",
                    "email",
                    "is_announcer",
                    "ranking",
                    "professional",
                    "ui_class_extra",
                    "offered_moderator_powers",
                    "moderator_powers",
                    "mod_powers_rejected",
                ];

                const settings: any = {};
                for (const f of fields) {
                    settings[f] = this.state[f];
                }

                settings.moderation_note = reason;

                put(`players/${this.props.playerId}/moderate`, settings)
                    .then(() => {
                        this.close();
                    })
                    .catch(errorAlerter);
            });
    };
    setLockedUsername = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ locked_username: ev.target.checked });
    setSupporter = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ supporter: ev.target.checked });
    setAnnouncer = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ is_announcer: ev.target.checked });
    setProfessional = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ professional: ev.target.checked });
    //setBanned = (ev) => this.setState({ is_banned: ev.target.checked });
    setShadowbanned = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ is_shadowbanned: ev.target.checked });
    setBot = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ is_bot: ev.target.checked });
    setBotOwner = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ bot_owner: parseInt(ev.target.value) });

    setUsername = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ username: ev.target.value });
    setEmail = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ email: ev.target.value });
    setPassword = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ password: ev.target.value });
    setRanking = (ev: React.ChangeEvent<HTMLSelectElement>) =>
        this.setState({ ranking: ev.target.value });
    setUiClassExtra = (ev: React.ChangeEvent<HTMLInputElement>) =>
        this.setState({ ui_class_extra: ev.target.value });

    deleteAccount = () => {
        const user_id = this.props.playerId;
        const username = (user_id && lookup(user_id)?.username) || "";

        void alert
            .fire({
                text: `Are you sure you want to delete the account "${username}" (${user_id})? This cannot be undone.`,
                showCancelButton: true,
            })
            .then(({ value: accept }) => {
                if (accept) {
                    del(`players/${user_id}`, {})
                        .then(() => {
                            void alert.fire("Done");
                        })
                        .catch(errorAlerter);
                }
            });
    };

    clearWarnings = () => {
        put(`moderation/clear_warnings/${this.props.playerId}`, {})
            .then((result) => {
                console.log(result);
                const outcome = result.cleared ? "flag cleared" : "there were none";
                void alert.fire("Done (" + outcome + ")");
            })
            .catch(errorAlerter);
    };

    makeOffer = (power_mask: number) => {
        if (this.state.moderator_powers) {
            // They already have some, we can give it direct
            this.setState({ moderator_powers: this.state.moderator_powers | power_mask });
        } else {
            // They are about to be a new CM ... we have to "offer"
            this.setState({
                offered_moderator_powers: this.state.moderator_powers | power_mask,
            });
        }
    };

    retractOffer = (power_mask: number) => {
        this.setState({
            offered_moderator_powers: this.state.moderator_powers & ~power_mask,
        });
    };

    removePower = (power_mask: number) => {
        this.setState({
            moderator_powers: this.state.moderator_powers & ~power_mask,
        });
    };

    render() {
        const moderator = data.get("user");
        const user = this.state;

        return (
            <div className="Modal ModerateUser">
                <div className="header">
                    <h1>{this.state.username}</h1>
                </div>
                {(this.state.loading === false || null) && (
                    <div className="body">
                        <div className="row">
                            <div className="col-sm-4">
                                <h3>Special Attributes</h3>
                                <dl className="horizontal left">
                                    {/*
                                    <dt><label htmlFor="supporter">Supporter</label></dt>
                                    <dd><input id="supporter" type="checkbox" checked={user.supporter} onChange={this.setSupporter} /></dd>
                                    */}

                                    <dt>
                                        <label htmlFor="announcer">Announcer</label>
                                    </dt>
                                    <dd>
                                        <input
                                            id="announcer"
                                            type="checkbox"
                                            checked={user.is_announcer}
                                            onChange={this.setAnnouncer}
                                        />
                                    </dd>

                                    <dt>
                                        <label htmlFor="professional">Professional</label>
                                    </dt>
                                    <dd>
                                        <input
                                            id="professional"
                                            type="checkbox"
                                            checked={user.professional}
                                            onChange={this.setProfessional}
                                        />
                                        {(user.professional || null) && (
                                            <select value={user.ranking} onChange={this.setRanking}>
                                                {pro_ranks.map((r, idx) => (
                                                    <option key={idx} value={r.rank}>
                                                        {r.label}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </dd>

                                    <dt>
                                        <label htmlFor="ui-class-extra">CSS Class</label>
                                    </dt>
                                    <dd>
                                        <input
                                            type="text"
                                            id="ui-class-extra"
                                            value={user.ui_class_extra}
                                            onChange={this.setUiClassExtra}
                                            autoComplete="off"
                                        />
                                    </dd>

                                    <dt>
                                        <label htmlFor="bot">Bot</label>
                                    </dt>
                                    <dd>
                                        <input
                                            id="bot"
                                            type="checkbox"
                                            checked={user.is_bot}
                                            onChange={this.setBot}
                                        />
                                        {(user.is_bot || null) && (
                                            <input
                                                type="number"
                                                style={{ width: "7rem" }}
                                                placeholder="Bot owner"
                                                value={this.state.bot_owner || ""}
                                                onChange={this.setBotOwner}
                                            />
                                        )}
                                    </dd>
                                </dl>
                            </div>
                            <div className="col-sm-8">
                                <h3>Account Info</h3>
                                <dl className="horizontal right">
                                    {/* "search" is a hack to get LastPass to not autofill */}
                                    <dt>
                                        <label htmlFor="user-search-name">Username</label>
                                    </dt>
                                    <dd>
                                        <input
                                            type="text"
                                            id="user-search-name"
                                            value={user.username}
                                            onChange={this.setUsername}
                                            autoComplete="off"
                                        />
                                    </dd>

                                    <dt>
                                        <label htmlFor="email">Email</label>
                                    </dt>
                                    <dd>
                                        <input
                                            type="text"
                                            id="email"
                                            value={user.email}
                                            onChange={this.setEmail}
                                            autoComplete="off"
                                        />
                                    </dd>

                                    <dt>
                                        <label htmlFor="password">Password</label>
                                    </dt>
                                    <dd>
                                        <input
                                            type="text"
                                            id="password"
                                            value={user.password}
                                            onChange={this.setPassword}
                                            autoComplete="off"
                                        />
                                    </dd>
                                    {/*
                                    <dt>
                                        <label htmlFor="banned">Banned</label>
                                    </dt>
                                    <dd>
                                        <input
                                            id="banned"
                                            type="checkbox"
                                            checked={user.is_banned}
                                            onChange={this.setBanned}
                                        />
                                    </dd>
                                    */}

                                    <dt>
                                        <label htmlFor="shadowbanned">Shadowbanned</label>
                                    </dt>
                                    <dd>
                                        <input
                                            id="shadowbanned"
                                            type="checkbox"
                                            checked={user.is_shadowbanned}
                                            onChange={this.setShadowbanned}
                                        />
                                    </dd>
                                </dl>
                            </div>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: "0.5rem",
                            }}
                        >
                            <div style={{ textAlign: "center" }}>
                                <button className="success" onClick={this.clearWarnings}>
                                    <i className="fa fa-check-circle-o" /> Clear warnings
                                </button>
                            </div>
                            {moderator.is_superuser && (
                                <div style={{ textAlign: "center" }}>
                                    <button className="reject" onClick={this.deleteAccount}>
                                        Delete account
                                    </button>
                                </div>
                            )}
                        </div>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, minmax(min-content, max-content))",
                                columnGap: "2rem",
                                rowGap: "0.1rem",
                            }}
                        >
                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator handle score cheating",
                                    "Handle Score Cheat",
                                )}
                                ability_mask={MODERATOR_POWERS.HANDLE_SCORE_CHEAT}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />
                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator handle escaping",
                                    "Handle Escaping",
                                )}
                                ability_mask={MODERATOR_POWERS.HANDLE_ESCAPING}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />
                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator handle stalling",
                                    "Handle Stalling",
                                )}
                                ability_mask={MODERATOR_POWERS.HANDLE_STALLING}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />
                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator vote for suspension",
                                    "Vote for Suspension",
                                )}
                                ability_mask={MODERATOR_POWERS.SUSPEND}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />

                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator vote on AI reports",
                                    "Assess AI Reports",
                                )}
                                ability_mask={MODERATOR_POWERS.ASSESS_AI_PLAY}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />
                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator vote on AI reports",
                                    "See banned status",
                                )}
                                ability_mask={MODERATOR_POWERS.SEE_REPORTED_USER_BANNED_STATUS}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />
                            <ModerationOfferControl
                                ability={pgettext(
                                    "Label for a button to let a community moderator join the AI detection team",
                                    "AI detection team",
                                )}
                                ability_mask={MODERATOR_POWERS.AI_DETECTOR}
                                currently_offered={this.state.offered_moderator_powers}
                                moderator_powers={this.state.moderator_powers}
                                previously_rejected={this.state.mod_powers_rejected}
                                onMakeOffer={this.makeOffer}
                                onRetractOffer={this.retractOffer}
                                onRemovePower={this.removePower}
                            />
                        </div>
                    </div>
                )}
                <div className="buttons">
                    <button onClick={this.close}>{_("Close")}</button>
                    {(this.state.loading === false || null) && (
                        <button onClick={this.save}>{_("Save")}</button>
                    )}
                </div>
            </div>
        );
    }
}

export function openModerateUserModal(user: PlayerCacheEntry) {
    return openModal(<ModerateUser playerId={user.id} />);
}
