import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, addDoc, getDocs } from 'firebase/firestore';

// Context for Firebase and User data
const AppContext = createContext(null); // useContext is used indirectly via AppContext.Provider/Consumer pattern

// Main App Component
function App() {
    // Firebase config moved outside useEffect for broader accessibility
    const firebaseConfig = {
        apiKey: "AIzaSyCd4yilR4WdBMPxDClXFCmNFlSbXUki6OE",
        authDomain: "nuzlocke-tracker-dbf81.firebaseapp.com",
        projectId: "nuzlocke-tracker-dbf81",
        storageBucket: "nuzlocke-tracker-dbf81.firebasestorage.app",
        messagingSenderId: "947586757526",
        appId: "1:947586757526:web:55079b0330547422e463b7",
        measurementId: "G-C1GVLT4T7V"
    };

    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [runs, setRuns] = useState([]);
    const [selectedRun, setSelectedRun] = useState(null);
    const [showNewGameModal, setShowNewGameModal] = useState(false);
    const [newRunName, setNewRunName] = useState('');
    const [newRunVariant, setNewRunVariant] = useState('Nuzlocke'); // Default variant
    const [showPokemonModal, setShowPokemonModal] = useState(false);
    const [currentPokemonEdit, setCurrentPokemonEdit] = useState(null); // For editing existing Pokemon
    const [isAddingNewPokemon, setIsAddingNewPokemon] = useState(false); // To differentiate adding vs editing
    const [pokemonSearchTerm, setPokemonSearchTerm] = useState(''); // Corrected state variable
    const [searchResults, setSearchResults] = useState([]); // Corrected state variable
    const [loadingPokemonData, setLoadingPokemonData] = useState(false); // Corrected state variable
    const [showShareModal, setShowShareModal] = useState(false); // Corrected state variable
    const [shareLink, setShareLink] = useState(''); // Corrected state variable
    const [importLink, setImportLink] = useState(''); // Corrected state variable
    const [showImportModal, setShowImportModal] = useState(false); // Corrected state variable
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false); // Corrected state variable
    const [runToDelete, setRunToDelete] = useState(null); // Corrected state variable
    const [showRuleSettingsModal, setShowRuleSettingsModal] = useState(false); // Corrected state variable
    const [currentRunRules, setCurrentRunRules] = useState({}); // Corrected state variable
    const [showPerkModal, setShowPerkModal] = useState(false); // Corrected state variable
    const [pokemonToPerk, setPokemonToPerk] = useState(null); // Corrected state variable
    const [showLinkPokemonModal, setShowLinkPokemonModal] = useState(false); // Corrected state variable
    const [showTeamConfigModal, setShowTeamConfigModal] = useState(false); // Corrected state variable

    // State for all abilities and moves for autofill
    const [allAbilities, setAllAbilities] = useState([]);
    const [allMoves, setAllMoves] = useState([]);

    // Available Nuzlocke Variants and their default rules
    const nuzlockeVariants = {
        'Nuzlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
        },
        'Hardcore Nuzlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Enforce Level Caps': true,
            'Set Battle Mode': true,
            'Ban Healing Items in Battle': true,
        },
        'Soul Link': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Linked Encounters': true,
            'Linked Fainting': true,
            'Linked PC': true,
            'No Shared Types in Party (Primary Types Only)': true, // Clarified rule for Soul Link
        },
        'Cage Locke': {
            'Fainting = Death': true, // Standard Nuzlocke Rule
            'First Encounter Only': true, // Standard Nuzlocke Rule
            'Nickname Clause': true, // Standard Nuzlocke Rule
            'Enforce Level Caps': true, // Hardcore Nuzlocke Rule
            'Set Battle Mode': true, // Hardcore Nuzlocke Rule
            'Ban Healing Items in Battle': true, // Hardcore Nuzlocke Rule
            'Ban TMs': true, // Unless earned via perk
            'Ban Held Items': true, // Unless earned via perk
        },
        'Wedlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Paired Pokémon': true,
            'Switching Restrictions': true,
        },
        'Egglocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Replace Encounters with Eggs': true,
        },
        'Monolocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Use Only Specific Type': true,
        },
        'Wonderlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Wonder Trade Encounters': true,
        },
        'Apocalocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Disaster Theme Restrictions': true,
        },
        'Giftlocke': {
            'Fainting = Death': true,
            'Nickname Clause': true,
            'No Catching': true,
            'Only Gift Pokémon': true,
        },
        'Generationlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Champions Carry Over': true,
        },
        'Trashlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Ban Good Pokémon': true,
        },
        'Snaplocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Half Pokémon Banned': true,
        },
        'Uniquelocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'No Shared Types in Party': true,
        },
        'NOHKOlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Box on One-Hit KO': true,
        },
        'Chesslocke': {
            'Fainting = Death': true,
            'Nickname Clause': true,
            'Chess Piece Restrictions': true,
        },
        'Zombielocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Zombie Revival': true,
        },
        'Loserlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Only One/Two Stage Evo': true,
            'Only Regular Poké Balls': true,
        },
        'BallLocke': {
            'Fainting = Death': true,
            'Nickname Clause': true,
            'One Pokémon Per Ball Type': true,
        },
        'Starlocke': {
            'Fainting = Death': true,
            'Nickname Clause': true,
            'Start with 18 Pokémon': true,
            'No Party Switching': true,
        },
        'Sleeplocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Single Sitting': true,
        },
        'Tasklocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Tasks Before Battles': true,
        },
        'Draftlocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Drafted Types Only': true,
        },
        'Tribelocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Group Encounters': true,
        },
        'Routelocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Only Route Pokémon': true,
        },
        'Taglocke': {
            'Fainting = Death': true,
            'First Encounter Only': true,
            'Nickname Clause': true,
            'Leg-based Relay': true,
        },
    };

    // Optional Nuzlocke Rules
    const optionalRules = {
        'Harder': {
            'Limit Pokémon Center Use (Once)': false,
            'Ban Pokémon Center Completely': false,
            'Enforce Level Caps': false,
            'Limit Team Size to Gym Leader': false,
            'No Leaving Gym': false,
            'Completionist Clause': false,
            'Set Battle Mode': false,
            'Ban Healing Items in Battle': false,
            'Limit One Healing Item Per Battle': false,
            'Only Picked Up Healing Items': false,
            'No Turning Back': false,
            'Ban Certain Powerful Pokémon': false,
            'Ban Pokémon Above Certain Tier': false,
            'Ban Starter Pokémon': false,
            'Ban Gift Pokémon': false,
            'Ban Setup/Stat Boosting Moves': false,
            'Ban TMs': false,
            'Do Run Blind (No Online References)': false,
            'No Damage Calculators': false,
            'Banning Held Items': false,
            'Banning Moves Above Certain Base Power': false,
            'Banning STAB Moves': false,
            'Banning Non-STAB Moves': false,
            'Banning Super-Effective Moves': false,
            'Use Only Single-Stage/NFE Pokémon': false,
            'Banning Pokémon of Certain Type': false,
            'Use ONLY Pokémon of Certain Type (Monolocke)': false,
            'Ban Dual-Type Pokémon': false,
            'Use ONLY Dual-Type Pokémon': false,
            'No Shared Types in Party (Primary Types Only)': false, // Updated to reflect primary only
            'Boxed Pokémon Cannot Be Reused': false,
            'Use Encounters in Order Caught': false,
            'Restart on ANY Faint (Deathless)': false,
            'Cage Match Limit (2)': false, // Cage Locke specific
            'Max 2 Pokémon BST > 580': false, // Cage Locke specific
        },
        'Easier': {
            'Allow ONE Revive': false,
            'Revive by Sacrificing Pokémon': false,
            'Treat Gift Pokémon as Free Encounters (Gift Clause)': false,
            'Catch Extra HM Pokémon': false,
            'Lock In One Pokémon': false,
            'Teach Egg Moves/Inaccessible Moves': false,
            'Modify IVs/Nature': false,
            'Unlimited TMs': false,
            'Unlimited Master Balls': false,
            'Reroll Escaped Encounter': false,
            'Level Cap Higher Than Gym Leader': false,
            'Continue After Whiteout': false,
        },
        'Miscellaneous': {
            'Duplicates Clause': false,
            'Shiny Clause': false,
            'Use Pokémon of Certain Color': false,
            'Use Pokémon That Fit Theme': false,
            'Use Only Pokémon From Current Generation': false,
            'Raid Dens as Encounter Source': false,
            'Randomize Starter Choice': false,
        }
    };

    // Available Perks for Cage Locke
    const availablePerks = [
        'Able to Teach TMs',
        'Able to Give Held Items',
        'Change the Nature of 1 Pokemon',
        'Give 2 Egg Moves to a Pokemon',
        '1 Free Revival in Game',
        'Custom Perk', // For user-defined perks
    ];

    // Initialize Firebase and Auth
    useEffect(() => {
        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is missing. Cannot initialize Firebase.");
            return;
        }

        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setUserId(user.uid);
                console.log("Authenticated with Firebase UID:", user.uid);
            } else {
                try {
                    // For local testing, we'll sign in anonymously directly.
                    // __initial_auth_token is only available in the Canvas environment.
                    await signInAnonymously(firebaseAuth);
                    console.log("Signed in anonymously.");
                } catch (error) {
                    console.error("Firebase authentication error:", error);
                }
            }
        });

        return () => unsubscribe();
    }, [firebaseConfig]); // Added firebaseConfig to dependencies

    // Fetch all abilities and moves for autofill
    useEffect(() => {
        const fetchAllAbilities = async () => {
            try {
                const response = await fetch('https://pokeapi.co/api/v2/ability/?limit=999');
                const data = await response.json();
                setAllAbilities(data.results.map(a => a.name.charAt(0).toUpperCase() + a.name.slice(1).replace(/-/g, ' ')));
            } catch (error) {
                console.error("Error fetching all abilities:", error);
            }
        };

        const fetchAllMoves = async () => {
            try {
                const response = await fetch('https://pokeapi.co/api/v2/move/?limit=9999');
                const data = await response.json();
                setAllMoves(data.results.map(m => m.name.charAt(0).toUpperCase() + m.name.slice(1).replace(/-/g, ' ')));
            } catch (error) {
                console.error("Error fetching all moves:", error);
            }
        };

        fetchAllAbilities();
        fetchAllMoves();
    }, []);

    // Fetch runs when userId is available and ensure selectedRun is updated
    useEffect(() => {
        if (!db || !userId) return;

        // Use firebaseConfig.projectId for the collection path
        const runsCollectionRef = collection(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/nuzlocke_runs`);
        const q = query(runsCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedRuns = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRuns(fetchedRuns);

            // CRITICAL FIX: If a run is currently selected, find its updated version and set it.
            // This ensures selectedRun always has the latest data, including partnerTeam/Pc.
            if (selectedRun) {
                const updatedSelectedRun = fetchedRuns.find(run => run.id === selectedRun.id);
                if (updatedSelectedRun) {
                    setSelectedRun(updatedSelectedRun); // Directly set the entire updated object
                } else {
                    // If the selected run was deleted by another instance, deselect it
                    setSelectedRun(null);
                }
            }
        }, (error) => {
            console.error("Error fetching runs:", error);
        });

        return () => unsubscribe();
    }, [db, userId, firebaseConfig.projectId]); // Removed 'selectedRun' from dependencies to prevent infinite loop

    // Function to create a new run
    const createNewRun = async () => {
        if (!db || !userId || !newRunName.trim()) {
            console.error("Database, user ID, or run name is missing.");
            return;
        }

        const runCount = runs.filter(run => run.variant === newRunVariant).length;
        const defaultName = `${newRunVariant} ${runCount + 1}`;
        const actualRunName = newRunName.trim() || defaultName;

        // Initialize rules based on selected variant and optional rules
        let initialRules = { ...nuzlockeVariants[newRunVariant] };
        // Merge in optional rules, allowing variant defaults to be overridden or new ones added
        Object.keys(optionalRules).forEach(category => {
            Object.keys(optionalRules[category]).forEach(rule => {
                // Only add if not already defined by variant or if it's explicitly set to true
                if (initialRules[rule] === undefined) {
                    initialRules[rule] = optionalRules[category][rule];
                }
            });
        });

        const newRun = {
            name: actualRunName,
            variant: newRunVariant,
            team: [],
            pc: [],
            graveyard: [],
            partnerTeam: [], // For Soul Links
            partnerPc: [], // For Soul Links
            rules: initialRules, // Store the rules for this specific run
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            soulLinkPartnerRunId: null, // To link runs for real-time sync
            soulLinkPartnerUserId: null, // To link runs for real-time sync
            nextLinkId: 0, // Initialize nextLinkId for this run
        };

        try {
            // Use firebaseConfig.projectId for the collection path
            const docRef = await addDoc(collection(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/nuzlocke_runs`), newRun);
            console.log("New run created with ID:", docRef.id);
            setSelectedRun({ id: docRef.id, ...newRun });
            setShowNewGameModal(false);
            setNewRunName('');
        } catch (e) {
            console.error("Error adding document: ", e);
        }
    };

    // Function to delete a run
    const deleteRun = async (runId) => {
        if (!db || !userId) return;
        try {
            // Use firebaseConfig.projectId for the document path
            await deleteDoc(doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/nuzlocke_runs`, runId));
            console.log("Run deleted:", runId);
            if (selectedRun && selectedRun.id === runId) {
                setSelectedRun(null); // Deselect if the current run is deleted
            }
            setShowConfirmDeleteModal(false);
            setRunToDelete(null);
        } catch (e) {
            console.error("Error deleting document: ", e);
        }
    };

    // Function to update a run
    const updateCurrentRun = async (updatedFields) => {
        if (!db || !userId || !selectedRun) return;
        try {
            // Use firebaseConfig.projectId for the document path
            await updateDoc(doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/nuzlocke_runs`, selectedRun.id), {
                ...updatedFields,
                lastUpdated: new Date().toISOString(),
            });
            setSelectedRun(prev => ({ ...prev, ...updatedFields }));
            console.log("Run updated successfully.");
        } catch (e) {
            console.error("Error updating run: ", e);
        }
    };

    // Function to add/edit a Pokémon
    const handleSavePokemon = async (pokemonData) => {
        if (!selectedRun) return;

        let updatedTeam = [...selectedRun.team];
        let updatedPc = [...selectedRun.pc];

        // Determine if adding new or editing existing
        // isAddingNewPokemon is a state variable in App, passed as prop to PokemonForm
        const isEditingExisting = currentPokemonEdit && (updatedTeam.some(p => p.id === currentPokemonEdit.id) || updatedPc.some(p => p.id === currentPokemonEdit.id));

        if (!isEditingExisting) {
            // Add new Pokemon to PC by default
            updatedPc.push({ ...pokemonData, id: Date.now().toString(), perks: [], cageMatchCount: 0, linkId: null }); // Initialize perks, cageMatchCount, linkId
        } else {
            // Editing existing Pokemon
            const updateList = (list) => list.map(p => p.id === currentPokemonEdit.id ? { ...p, ...pokemonData } : p);
            updatedTeam = updateList(updatedTeam);
            updatedPc = updateList(updatedPc);
        }

        await updateCurrentRun({ team: updatedTeam, pc: updatedPc });
        setShowPokemonModal(false);
        setCurrentPokemonEdit(null);
        setIsAddingNewPokemon(false); // Reset this state after saving
    };

    // Function to move a Pokémon between team, PC, and graveyard
    const movePokemon = async (pokemonId, fromList, toList) => {
        if (!selectedRun) return;

        let currentTeam = [...selectedRun.team];
        let currentPc = [...selectedRun.pc];
        let currentGraveyard = [...selectedRun.graveyard];

        let pokemonToMove;

        // Find and remove from source list
        if (fromList === 'team') {
            const index = currentTeam.findIndex(p => p.id === pokemonId);
            if (index > -1) {
                pokemonToMove = currentTeam.splice(index, 1)[0];
            }
        } else if (fromList === 'pc') {
            const index = currentPc.findIndex(p => p.id === pokemonId);
            if (index > -1) {
                pokemonToMove = currentPc.splice(index, 1)[0];
            }
        } else if (fromList === 'graveyard') {
            const index = currentGraveyard.findIndex(p => p.id === pokemonId);
            if (index > -1) {
                pokemonToMove = currentGraveyard.splice(index, 1)[0];
            }
        }

        if (pokemonToMove) {
            // Add to destination list
            if (toList === 'team') {
                currentTeam.push(pokemonToMove);
            } else if (toList === 'pc') {
                currentPc.push(pokemonToMove);
            } else if (toList === 'graveyard') {
                currentGraveyard.push({ ...pokemonToMove, fainted: true, faintedAt: new Date().toISOString() });
            }

            await updateCurrentRun({
                team: currentTeam,
                pc: currentPc,
                graveyard: currentGraveyard,
            });
        }
    };

    // Function to mark a Pokémon as fainted (sends to graveyard)
    const markFainted = async (pokemonId, fromList) => {
        if (!selectedRun) return;

        let currentTeam = [...selectedRun.team];
        let currentPc = [...selectedRun.pc];
        let currentGraveyard = [...selectedRun.graveyard];

        let pokemonToFaint;

        if (fromList === 'team') {
            const index = currentTeam.findIndex(p => p.id === pokemonId);
            if (index > -1) {
                pokemonToFaint = currentTeam.splice(index, 1)[0];
            }
        } else if (fromList === 'pc') {
            const index = currentPc.findIndex(p => p.id === pokemonId);
            if (index > -1) {
                pokemonToFaint = currentPc.splice(index, 1)[0];
            }
        }

        if (pokemonToFaint) {
            currentGraveyard.push({ ...pokemonToFaint, fainted: true, faintedAt: new Date().toISOString() });
            await updateCurrentRun({
                team: currentTeam,
                pc: currentPc,
                graveyard: currentGraveyard,
            });

            // Soul Link: If linked fainting is active, mark partner as fainted
            if (selectedRun.variant === 'Soul Link' && selectedRun.rules['Linked Fainting'] && pokemonToFaint.linkId !== null && pokemonToFaint.linkId !== undefined) { // Check for linkId
                await markPartnerFainted(pokemonToFaint.linkId, selectedRun.soulLinkPartnerRunId, selectedRun.soulLinkPartnerUserId);
            }
        }
    };

    // Helper for Soul Link partner fainting (requires partner's run to be accessible)
    const markPartnerFainted = async (partnerPokemonLinkId, partnerRunId, partnerUserId) => { // Now uses linkId
        if (!db || !partnerRunId || !partnerUserId) return;

        try {
            // Use firebaseConfig.projectId for the document path
            const partnerRunRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${partnerUserId}/nuzlocke_runs`, partnerRunId);
            const partnerRunSnap = await getDoc(partnerRunRef);

            if (partnerRunSnap.exists()) {
                const partnerRunData = partnerRunSnap.data();
                let partnerTeam = [...partnerRunData.team];
                let partnerPc = [...partnerRunData.pc];
                let partnerGraveyard = [...partnerRunData.graveyard];

                let pokemonToFaint;

                // Find partner's linked Pokémon by linkId
                const findAndRemoveByLinkId = (list) => {
                    const index = list.findIndex(p => p.linkId === partnerPokemonLinkId);
                    if (index > -1) return list.splice(index, 1)[0];
                    return null;
                };

                pokemonToFaint = findAndRemoveByLinkId(partnerTeam) || findAndRemoveByLinkId(partnerPc);

                if (pokemonToFaint) {
                    partnerGraveyard.push({ ...pokemonToFaint, fainted: true, faintedAt: new Date().toISOString() });
                    await updateDoc(partnerRunRef, {
                        team: partnerTeam,
                        pc: partnerPc,
                        graveyard: partnerGraveyard,
                        lastUpdated: new Date().toISOString(),
                    });
                    console.log(`Partner Pokémon (linked ID ${partnerPokemonLinkId}) marked fainted in run ${partnerRunId}`);
                }
            }
        } catch (error) {
            console.error("Error marking partner Pokémon fainted:", error);
        }
    };


    // Function to revive a Pokémon (moves from graveyard to PC)
    const revivePokemon = async (pokemonId) => {
        if (!selectedRun) return;

        let currentGraveyard = [...selectedRun.graveyard];
        let currentPc = [...selectedRun.pc];

        const index = currentGraveyard.findIndex(p => p.id === pokemonId);
        if (index > -1) {
            const revivedPokemon = currentGraveyard.splice(index, 1)[0];
            delete revivedPokemon.fainted; // Remove fainted status
            delete revivedPokemon.faintedAt;
            currentPc.push(revivedPokemon);

            await updateCurrentRun({
                graveyard: currentGraveyard,
                pc: currentPc,
            });
        }
    };

    // Function to release a Pokémon (permanently remove)
    const releasePokemon = async (pokemonId, fromList) => {
        if (!selectedRun) return;

        let updatedTeam = [...selectedRun.team];
        let updatedPc = [...selectedRun.pc];
        let updatedGraveyard = [...selectedRun.graveyard];

        const removePokemon = (list) => list.filter(p => p.id !== pokemonId);

        if (fromList === 'team') {
            updatedTeam = removePokemon(updatedTeam);
        } else if (fromList === 'pc') {
            updatedPc = removePokemon(updatedPc);
        } else if (fromList === 'graveyard') {
            updatedGraveyard = removePokemon(updatedGraveyard);
        }

        await updateCurrentRun({
            team: updatedTeam,
            pc: updatedPc,
            graveyard: updatedGraveyard,
        });
        console.log(`Pokémon ${pokemonId} released.`);
    };

    // Handle rule changes
    const handleRuleChange = (ruleName, category, value) => {
        setCurrentRunRules(prevRules => ({
            ...prevRules,
            [ruleName]: value
        }));
    };

    // Save rule changes to the selected run
    const saveRuleChanges = async () => {
        if (!selectedRun) return;
        await updateCurrentRun({ rules: currentRunRules });
        setShowRuleSettingsModal(false);
    };

    // Function to give a perk to a Pokémon
    const handleGivePerk = async (pokemonId, perksToAdd) => {
        if (!selectedRun) return;

        let updatedTeam = [...selectedRun.team];
        let updatedPc = [...selectedRun.pc];

        const updateListWithPerks = (list) => list.map(p => {
            if (p.id === pokemonId) {
                const newPerks = [...(p.perks || []), ...perksToAdd];
                return { ...p, perks: Array.from(new Set(newPerks)) }; // Ensure unique perks
            }
            return p;
        });

        updatedTeam = updateListWithPerks(updatedTeam);
        updatedPc = updateListWithPerks(updatedPc);

        await updateCurrentRun({ team: updatedTeam, pc: updatedPc });
        setShowPerkModal(false);
        setPokemonToPerk(null);
    };

    // Soul Link: Function to link two Pokémon
    const linkPokemon = async (myPokemonId, partnerPokemonId) => {
        if (!db || !userId || !selectedRun || !selectedRun.soulLinkPartnerRunId || !selectedRun.soulLinkPartnerUserId) {
            console.error("Cannot link Pokémon: missing run or partner info.");
            alert("Cannot link Pokémon: Please ensure a run is selected and a partner is imported.");
            return;
        }

        // Use firebaseConfig.projectId for the document paths
        const myRunRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/nuzlocke_runs`, selectedRun.id);
        const partnerRunRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${selectedRun.soulLinkPartnerUserId}/nuzlocke_runs`, selectedRun.soulLinkPartnerRunId);

        try {
            // Get the current nextLinkId from my run
            const myRunSnap = await getDoc(myRunRef);
            const currentNextLinkId = myRunSnap.exists() ? (myRunSnap.data().nextLinkId || 0) : 0;

            // Prepare updates for my run
            let myUpdatedTeam = [...selectedRun.team];
            let myUpdatedPc = [...selectedRun.pc];
            const updateMyPokemon = (list) => list.map(p => {
                if (p.id === myPokemonId) {
                    return {
                        ...p,
                        linkedPokemonId: partnerPokemonId,
                        linkedPartnerRunId: selectedRun.soulLinkPartnerRunId,
                        linkedPartnerUserId: selectedRun.soulLinkPartnerUserId,
                        linkId: currentNextLinkId, // Assign the new link ID
                    };
                }
                return p;
            });
            myUpdatedTeam = updateMyPokemon(myUpdatedTeam);
            myUpdatedPc = updateMyPokemon(myUpdatedPc);

            // Prepare updates for partner's run
            const partnerRunSnap = await getDoc(partnerRunRef);
            let partnerUpdatedTeam = [];
            let partnerUpdatedPc = [];

            if (partnerRunSnap.exists()) {
                const partnerData = partnerRunSnap.data();
                partnerUpdatedTeam = [...partnerData.team];
                partnerUpdatedPc = [...partnerData.pc];

                const updatePartnerPokemon = (list) => list.map(p => {
                    if (p.id === partnerPokemonId) {
                        return {
                            ...p,
                            linkedPokemonId: myPokemonId,
                            linkedPartnerRunId: selectedRun.id, // Reference back to my run
                            linkedPartnerUserId: userId, // Reference back to my user
                            linkId: currentNextLinkId, // Assign the same link ID
                        };
                    }
                    return p;
                });
                partnerUpdatedTeam = updatePartnerPokemon(partnerUpdatedTeam);
                partnerUpdatedPc = updatePartnerPokemon(partnerUpdatedPc);
            } else {
                alert("Partner run not found or accessible. Cannot complete linking on partner's side.");
                // Optionally, revert changes on my side if partner's update fails
                return;
            }

            // Perform updates on both runs
            await updateDoc(myRunRef, {
                team: myUpdatedTeam,
                pc: myUpdatedPc,
                nextLinkId: currentNextLinkId + 1, // Increment link ID for next pair
                lastUpdated: new Date().toISOString(),
            });

            await updateDoc(partnerRunRef, {
                team: partnerUpdatedTeam,
                pc: partnerUpdatedPc,
                lastUpdated: new Date().toISOString(),
            });

            // Update local selectedRun state to reflect changes immediately
            setSelectedRun(prev => {
                const newTeam = prev.team.map(p => p.id === myPokemonId ? { ...p, linkId: currentNextLinkId, linkedPokemonId: partnerPokemonId, linkedPartnerRunId: selectedRun.soulLinkPartnerRunId, linkedPartnerUserId: selectedRun.soulLinkPartnerUserId } : p);
                const newPc = prev.pc.map(p => p.id === myPokemonId ? { ...p, linkId: currentNextLinkId, linkedPokemonId: partnerPokemonId, linkedPartnerRunId: selectedRun.soulLinkPartnerRunId, linkedPartnerUserId: selectedRun.soulLinkPartnerUserId } : p);

                return {
                    ...prev,
                    team: newTeam,
                    pc: newPc,
                    nextLinkId: currentNextLinkId + 1,
                    // partnerTeam and partnerPc will be updated by the onSnapshot listener for the partner's run
                };
            });


            console.log(`Pokémon ${myPokemonId} linked with partner Pokémon ${partnerPokemonId} with linkId: ${currentNextLinkId}`);
            setShowLinkPokemonModal(false); // Close modal after linking
            alert(`Pokémon linked successfully with ID: ${currentNextLinkId}!`); // User feedback
        } catch (error) {
            console.error("Error linking Pokémon:", error);
            alert(`Error linking Pokémon: ${error.message}`); // More specific error to user
        }
    };


    // Pokemon Search Logic (PokeAPI)
    const searchPokemon = async (term) => {
        if (!term) {
            setPokemonSearchTerm(""); // Corrected to setPokemonSearchTerm
            setSearchResults([]);
            return;
        }
        setLoadingPokemonData(true);
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${term.toLowerCase()}`);
            if (response.ok) {
                const data = await response.json(); // Declare data here
                setSearchResults([{ // Corrected to setSearchResults
                    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
                    sprite: data.sprites.front_default,
                    types: data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)),
                    abilities: data.abilities.map(a => a.ability.name.charAt(0).toUpperCase() + a.ability.name.slice(1)),
                    // We'll let moves be free text input initially as per request, but PokeAPI has them too
                }]);
            } else {
                setSearchResults([]); // Corrected to setSearchResults
            }
        } catch (error) {
            console.error("Error fetching Pokémon from PokeAPI:", error);
            setSearchResults([]); // Corrected to setSearchResults
        } finally {
            setLoadingPokemonData(false);
        }
    };

    // Soul Link: Generate Share Link
    const generateShareLink = () => {
        if (!selectedRun || !userId) {
            setShareLink('Error: Select a run first.');
            return;
        }
        // This link will contain the run ID and user ID for the partner to import
        const link = `${window.location.origin}/?importRunId=${selectedRun.id}&importUserId=${userId}`;
        setShareLink(link);
    };

    // Soul Link: Handle Import
    const handleImportRun = async () => {
        if (!db || !userId || !importLink) {
            console.log("Import failed: DB, userId, or importLink missing.", { db, userId, importLink });
            alert("Import failed. Please ensure the link is not empty.");
            return;
        }
        console.log("Attempting to import link:", importLink); // Debugging line

        try {
            const url = new URL(importLink); // Ensure the URL is valid
            const urlParams = new URLSearchParams(url.search);
            const partnerRunId = urlParams.get('importRunId');
            const partnerUserId = urlParams.get('importUserId');

            if (!partnerRunId || !partnerUserId) {
                console.error("Invalid import link: missing partnerRunId or partnerUserId.", { partnerRunId, partnerUserId });
                alert("Invalid import link. Please ensure it's a valid Soul Link URL."); // User feedback
                return;
            }
            console.log(`Found partnerRunId: ${partnerRunId}, partnerUserId: ${partnerUserId}`); // Debugging line

            // Check if the partner run exists and is accessible
            // Use firebaseConfig.projectId for the document path
            const partnerRunRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${partnerUserId}/nuzlocke_runs`, partnerRunId);
            const partnerRunSnap = await getDoc(partnerRunRef);

            if (!partnerRunSnap.exists()) {
                console.error("Partner run not found or not accessible for linking.");
                alert("Partner run not found or you don't have access to it."); // User feedback
                return;
            }
            console.log("Partner run found. Proceeding with linking."); // Debugging line

            // Update current run with partner's run ID and user ID
            await updateDoc(doc(db, `artifacts/${firebaseConfig.projectId}/users/${userId}/nuzlocke_runs`, selectedRun.id), {
                soulLinkPartnerRunId: partnerRunId,
                soulLinkPartnerUserId: partnerUserId,
                lastUpdated: new Date().toISOString(),
            });

            // Also update the selectedRun state locally for immediate feedback
            setSelectedRun(prev => ({
                ...prev,
                soulLinkPartnerRunId: partnerRunId,
                soulLinkPartnerUserId: partnerUserId,
            }));

            console.log("Current run updated with partner link."); // Debugging line

            // The real-time listener for partner's run is already set up in a separate useEffect,
            // which will automatically pick up the new soulLinkPartnerRunId and soulLinkPartnerUserId
            // from the selectedRun state update.

            setShowImportModal(false);
            setImportLink('');
            console.log("Soul Link established successfully with partner run:", partnerRunId);
            alert("Soul Link established successfully!"); // User feedback
        } catch (error) {
            console.error("Error importing Soul Link:", error);
            alert(`Error importing Soul Link: ${error.message}`); // More specific error to user
        }
    };

    // Soul Link: Real-time Listener for partner's data (if linked)
    useEffect(() => {
        if (!db || !selectedRun || selectedRun.variant !== 'Soul Link' || !selectedRun.soulLinkPartnerRunId || !selectedRun.soulLinkPartnerUserId) {
            return;
        }

        // Use firebaseConfig.projectId for the document path
        const partnerRunRef = doc(db, `artifacts/${firebaseConfig.projectId}/users/${selectedRun.soulLinkPartnerUserId}/nuzlocke_runs`, selectedRun.soulLinkPartnerRunId);

        const unsubscribePartner = onSnapshot(partnerRunRef, (snapshot) => {
            const partnerData = snapshot.data();
            if (partnerData) {
                setSelectedRun(prev => ({
                    ...prev,
                    partnerTeam: partnerData.team,
                    partnerPc: partnerData.pc,
                }));
            }
        }, (error) => {
            console.error("Error listening to partner run:", error);
        });

        return () => unsubscribePartner();
    }, [db, selectedRun?.id, selectedRun?.soulLinkPartnerRunId, selectedRun?.soulLinkPartnerUserId, selectedRun?.variant, firebaseConfig.projectId]);


    if (!userId) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="text-xl font-semibold">Loading app...</div>
            </div>
        );
    }

    return (
        <AppContext.Provider value={{ db, auth, userId, selectedRun, updateCurrentRun }}>
            <div className="min-h-screen bg-gray-900 text-gray-100 font-inter p-4 flex flex-col items-center">
                {/* Add a style block for the input-field class */}
                <style>
                    {`
                    .input-field {
                        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                        appearance: none;
                        border-radius: 0.25rem;
                        width: 100%;
                        padding-top: 0.5rem;
                        padding-bottom: 0.5rem;
                        padding-left: 0.75rem;
                        padding-right: 0.75rem;
                        color: #000; /* Changed text color to black */
                        line-height: 1.25;
                        background-color: #e2e8f0; /* bg-gray-200 */
                        outline: none;
                    }
                    .input-field:focus {
                        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5); /* focus:shadow-outline */
                    }
                    /* Custom scrollbar for better aesthetics */
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 8px;
                    }

                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: #4a5568; /* gray-700 */
                        border-radius: 10px;
                    }

                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #6b7280; /* gray-500 */
                        border-radius: 10px;
                    }

                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #9ca3af; /* gray-400 */
                    }
                    `}
                </style>
                {/* Title */}
                <h1 className="text-4xl font-bold mb-6 text-emerald-400">Pokémon Nuzlocke & Soul Link Tracker</h1>

                {/* User ID Display */}
                <div className="text-sm text-gray-400 mb-4">
                    Your User ID: <span className="font-mono bg-gray-800 px-2 py-1 rounded">{userId}</span>
                </div>

                {/* Main Content Area */}
                <div className="w-full max-w-6xl bg-gray-800 rounded-lg shadow-xl p-6">
                    {selectedRun ? (
                        /* Display Selected Run */
                        <div className="flex flex-col space-y-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-3xl font-semibold text-blue-300">{selectedRun.name} ({selectedRun.variant})</h2>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setShowRuleSettingsModal(true)}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition duration-200 shadow-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 2a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V4a2 2 0 00-2-2h-2zM4 9a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H4zM10 9a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2zM4 16a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H4zM10 16a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2zM16 9a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2zM16 16a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
                                        </svg>
                                        Rules
                                    </button>
                                    {selectedRun.variant === 'Soul Link' && (
                                        <>
                                            <button
                                                onClick={() => { generateShareLink(); setShowShareModal(true); }}
                                                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition duration-200 shadow-md"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M15 8a3 3 0 10-2.977-2.977l-2.121 3.337A3 3 0 009 12v1a3 3 0 105.977.977l2.121-3.337A3 3 0 0015 8zM6 12a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
                                                </svg>
                                                Share
                                            </button>
                                            <button
                                                onClick={() => setShowImportModal(true)}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition duration-200 shadow-md"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                Import
                                            </button>
                                            {selectedRun.soulLinkPartnerRunId && (
                                                <button
                                                    onClick={() => setShowLinkPokemonModal(true)}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-200 shadow-md"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5.656 12.828a2 2 0 11-2.828-2.828l3-3a2 2 0 012.828 0 1 1 0 001.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 005.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5z" clipRule="evenodd" />
                                                    </svg>
                                                    Link Pokémon
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button
                                        onClick={() => setShowTeamConfigModal(true)}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition duration-200 shadow-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9.504 2.302a.75.75 0 01.992 0l1.752 1.502 1.654-.239a.75.75 0 01.874.654l.163 1.704 1.597 1.058a.75.75 0 01.026 1.139l-1.156 1.55.202 1.73a.75.75 0 01-.798.706l-1.745-.168-1.077 1.492a.75.75 0 01-1.154.015l-1.077-1.492-1.745.168a.75.75 0 01-.798-.706l.202-1.73-1.156-1.55a.75.75 0 01.026-1.139l1.597-1.058.163-1.704a.75.75 0 01.874-.654l1.654.239 1.752-1.502zM10 8a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" />
                                        </svg>
                                        Configure Team
                                    </button>
                                    <button
                                        onClick={() => setSelectedRun(null)}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200 shadow-md"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        Close Run
                                    </button>
                                </div>
                            </div>

                            {/* My Team & PC */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* My Team */}
                                <div className="bg-gray-700 p-4 rounded-md shadow-inner">
                                    <h3 className="text-xl font-semibold mb-3 text-red-300">My Team</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {selectedRun.team.map(pokemon => (
                                            <PokemonCard
                                                key={pokemon.id}
                                                pokemon={pokemon}
                                                onEdit={() => { setCurrentPokemonEdit(pokemon); setIsAddingNewPokemon(false); setShowPokemonModal(true); }}
                                                onMoveToPc={() => movePokemon(pokemon.id, 'team', 'pc')}
                                                onFaint={() => markFainted(pokemon.id, 'team')}
                                                onRelease={() => releasePokemon(pokemon.id, 'team')}
                                                onGivePerk={() => { setPokemonToPerk(pokemon); setShowPerkModal(true); }}
                                                currentList="team"
                                            />
                                        ))}
                                        {selectedRun.team.length < 6 && (
                                            <button
                                                onClick={() => { setIsAddingNewPokemon(true); setCurrentPokemonEdit(null); setShowPokemonModal(true); }}
                                                className="col-span-1 flex items-center justify-center p-4 bg-gray-600 rounded-md text-gray-300 hover:bg-gray-500 transition duration-200 border-2 border-dashed border-gray-500"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                                <span className="ml-2">Add Pokémon</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* My PC */}
                                <div className="bg-gray-700 p-4 rounded-md shadow-inner">
                                    <h3 className="text-xl font-semibold mb-3 text-yellow-300">My PC</h3>
                                    <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                                        {selectedRun.pc.map(pokemon => (
                                            <PokemonCard
                                                key={pokemon.id}
                                                pokemon={pokemon}
                                                onEdit={() => { setCurrentPokemonEdit(pokemon); setIsAddingNewPokemon(false); setShowPokemonModal(true); }}
                                                onMoveToTeam={() => movePokemon(pokemon.id, 'pc', 'team')}
                                                onFaint={() => markFainted(pokemon.id, 'pc')}
                                                onRelease={() => releasePokemon(pokemon.id, 'pc')}
                                                onGivePerk={() => { setPokemonToPerk(pokemon); setShowPerkModal(true); }}
                                                currentList="pc"
                                            />
                                        ))}
                                        {selectedRun.pc.length === 0 && (
                                            <p className="text-gray-400 text-center col-span-3">No Pokémon in PC.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Soul Link Partner Team & PC (Conditional) */}
                            {selectedRun.variant === 'Soul Link' && selectedRun.soulLinkPartnerRunId && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    {/* Partner Team */}
                                    <div className="bg-gray-700 p-4 rounded-md shadow-inner">
                                        <h3 className="text-xl font-semibold mb-3 text-indigo-300">Partner's Team</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            {selectedRun.partnerTeam?.map(pokemon => (
                                                <PokemonCard key={pokemon.id} pokemon={pokemon} isPartner={true} />
                                            ))}
                                            {selectedRun.partnerTeam?.length === 0 && (
                                                <p className="text-gray-400 text-center col-span-3">Partner has no Pokémon in team.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Partner PC */}
                                    <div className="bg-gray-700 p-4 rounded-md shadow-inner">
                                        <h3 className="text-xl font-semibold mb-3 text-pink-300">Partner's PC</h3>
                                        <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto custom-scrollbar">
                                            {selectedRun.partnerPc?.map(pokemon => (
                                                <PokemonCard key={pokemon.id} pokemon={pokemon} isPartner={true} />
                                            ))}
                                            {selectedRun.partnerPc?.length === 0 && (
                                                <p className="text-gray-400 text-center col-span-3">Partner has no Pokémon in PC.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Graveyard */}
                            <div className="bg-gray-700 p-4 rounded-md shadow-inner mt-6">
                                <h3 className="text-xl font-semibold mb-3 text-gray-400">Graveyard</h3>
                                <div className="grid grid-cols-6 gap-3 max-h-48 overflow-y-auto custom-scrollbar">
                                    {selectedRun.graveyard.map(pokemon => (
                                        <PokemonCard
                                            key={pokemon.id}
                                            pokemon={pokemon}
                                            isFainted={true}
                                            onRevive={() => revivePokemon(pokemon.id)}
                                            onRelease={() => releasePokemon(pokemon.id, 'graveyard')}
                                            currentList="graveyard"
                                        />
                                    ))}
                                    {selectedRun.graveyard.length === 0 && (
                                        <p className="text-gray-400 text-center col-span-6">No Pokémon in graveyard.</p>
                                    )}
                                </div>
                            </div>

                            {/* Soul Link Instructions */}
                            {selectedRun.variant === 'Soul Link' && (
                                <div className="bg-gray-700 p-4 rounded-md shadow-inner mt-6">
                                    <h3 className="text-xl font-semibold mb-3 text-yellow-300">Soul Link Instructions:</h3>
                                    <div className="text-gray-300 space-y-2">
                                        <p>1. To start a Soul Link, both players must create a new "Soul Link" run.</p>
                                        <p>2. Each player should add their initial Pokémon to their team/PC.</p>
                                        <p>3. **Share Links:** Player A clicks "Share" and copies their link. Player B clicks "Import" and pastes Player A's link. Then, Player B clicks "Share" and copies their link, and Player A clicks "Import" and pastes Player B's link.</p>
                                        <p>4. **Link Pokémon:** Once both players have imported each other's links, click the "Link Pokémon" button. Select one of your Pokémon and one of your partner's Pokémon to create a link. This will assign them a numerical Link ID.</p>
                                        <p>5. **Real-time Updates:** After linking, changes (like faints or moves) should update in real-time. If a linked Pokémon's status changes on one screen, its partner's status will update on the other.</p>
                                        <p className="text-sm text-gray-400">*(Note: Occasional page refresh might be needed for full consistency, especially after initial linking or if connection is interrupted.)*</p>
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        /* Display List of Runs */
                        <div className="flex flex-col items-center">
                            <button
                                onClick={() => { setShowNewGameModal(true); setNewRunName(''); setNewRunVariant('Nuzlocke'); }}
                                className="px-6 py-3 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition duration-200 shadow-lg mb-6"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Create New Game
                            </button>

                            <div className="w-full">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-200">Saved Runs</h2>
                                {runs.length === 0 ? (
                                    <p className="text-gray-400 text-center">No saved runs yet. Click "Create New Game" to start!</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {runs.map(run => (
                                            <div
                                                key={run.id}
                                                className="relative bg-gray-700 p-4 rounded-md shadow-lg flex flex-col cursor-pointer hover:bg-gray-600 transition duration-200"
                                                onClick={() => setSelectedRun(run)}
                                            >
                                                <h3 className="text-xl font-semibold text-white mb-2">{run.name}</h3>
                                                <p className="text-gray-300 text-sm mb-3">Variant: {run.variant}</p>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {run.team && run.team.slice(0, 6).map(pokemon => (
                                                        <img
                                                            key={pokemon.id}
                                                            src={pokemon.sprite || `https://placehold.co/40x40/000000/FFFFFF?text=${pokemon.name.slice(0, 2)}`}
                                                            alt={pokemon.name}
                                                            className="w-10 h-10 rounded-full border-2 border-blue-400 object-contain bg-gray-900"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/40x40/000000/FFFFFF?text=${pokemon.name.slice(0, 2)}`; }}
                                                            title={pokemon.name}
                                                        />
                                                    ))}
                                                    {run.team && run.team.length === 0 && <p className="text-gray-400 text-sm">No Pokémon in team.</p>}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent opening the run
                                                        setRunToDelete(run.id);
                                                        setShowConfirmDeleteModal(true);
                                                    }}
                                                    className="absolute top-2 right-2 p-1 bg-red-600 rounded-full text-white hover:bg-red-700 transition duration-200"
                                                    title="Delete Run"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modals */}
                {/* New Game Modal */}
                {showNewGameModal && (
                    <Modal onClose={() => setShowNewGameModal(false)} title="Create New Game">
                        <div className="p-4">
                            <label htmlFor="runName" className="block text-gray-300 text-sm font-bold mb-2">
                                Run Name:
                            </label>
                            <input
                                type="text"
                                id="runName"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-4"
                                value={newRunName}
                                onChange={(e) => setNewRunName(e.target.value)}
                                placeholder="e.g., My FireRed Nuzlocke"
                            />

                            <label htmlFor="nuzlockeVariant" className="block text-gray-300 text-sm font-bold mb-2">
                                Nuzlocke Variant:
                            </label>
                            <select
                                id="nuzlockeVariant"
                                className="shadow border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-6"
                                value={newRunVariant}
                                onChange={(e) => setNewRunVariant(e.target.value)}
                            >
                                {Object.keys(nuzlockeVariants).map(variant => (
                                    <option key={variant} value={variant}>{variant}</option>
                                ))}
                            </select>

                            <button
                                onClick={createNewRun}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            >
                                Create Run
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Pokemon Add/Edit Modal */}
                {showPokemonModal && (
                    <Modal onClose={() => setShowPokemonModal(false)} title={currentPokemonEdit ? "Edit Pokémon" : "Add New Pokémon"} size="sm">
                        <PokemonForm
                            pokemon={currentPokemonEdit}
                            isAddingNew={currentPokemonEdit === null} // Correctly determine if adding new
                            onSave={handleSavePokemon}
                            onSearchPokemon={searchPokemon}
                            searchResults={searchResults}
                            loadingPokemonData={loadingPokemonData}
                            pokemonSearchTerm={pokemonSearchTerm}
                            setPokemonSearchTerm={setPokemonSearchTerm}
                            setSearchResults={setSearchResults}
                            allAbilities={allAbilities} // Pass all abilities
                            allMoves={allMoves} // Pass all moves
                        />
                    </Modal>
                )}

                {/* Share Soul Link Modal */}
                {showShareModal && (
                    <Modal onClose={() => setShowShareModal(false)} title="Share Soul Link">
                        <div className="p-4">
                            <p className="text-gray-300 mb-4">Share this link with your Soul Link partner to connect your runs:</p>
                            <input
                                type="text"
                                readOnly
                                value={shareLink}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-4"
                            />
                            <button
                                onClick={() => {
                                    document.execCommand('copy'); // Fallback for navigator.clipboard
                                    const el = document.createElement('textarea');
                                    el.value = shareLink;
                                    document.body.appendChild(el);
                                    el.select();
                                    document.execCommand('copy');
                                    document.body.removeChild(el);
                                    alert('Link copied to clipboard!'); // Using alert for simplicity, would replace with custom toast
                                }}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            >
                                Copy Link
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Import Soul Link Modal */}
                {showImportModal && (
                    <Modal onClose={() => setShowImportModal(false)} title="Import Soul Link">
                        <div className="p-4">
                            <p className="text-gray-300 mb-4">Paste your partner's Soul Link here:</p>
                            <input
                                type="text"
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline bg-gray-200 mb-4"
                                value={importLink}
                                onChange={(e) => setImportLink(e.target.value)}
                                placeholder="Paste partner's link here..."
                            />
                            <button
                                onClick={handleImportRun}
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            >
                                Import Link
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Confirm Delete Modal */}
                {showConfirmDeleteModal && (
                    <Modal onClose={() => setShowConfirmDeleteModal(false)} title="Confirm Delete">
                        <div className="p-4 text-center">
                            <p className="text-gray-300 mb-6">Are you sure you want to delete this run? This action cannot be undone.</p>
                            <div className="flex justify-center space-x-4">
                                <button
                                    onClick={() => {
                                        if (runToDelete) deleteRun(runToDelete);
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setShowConfirmDeleteModal(false)}
                                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Rule Settings Modal */}
                {showRuleSettingsModal && selectedRun && (
                    <Modal onClose={() => setShowRuleSettingsModal(false)} title={`Rules for ${selectedRun.name}`}>
                        <div className="p-4 max-h-96 overflow-y-auto custom-scrollbar">
                            <h3 className="text-xl font-semibold mb-3 text-blue-300">Variant: {selectedRun.variant}</h3>
                            <div className="mb-4">
                                <p className="text-gray-300 font-semibold mb-2">Core Rules (from variant):</p>
                                {Object.entries(nuzlockeVariants[selectedRun.variant] || {}).map(([rule, defaultValue]) => (
                                    <div key={rule} className="flex items-center mb-2">
                                        <input
                                            type="checkbox"
                                            id={`core-rule-${rule}`}
                                            checked={currentRunRules[rule] !== undefined ? currentRunRules[rule] : defaultValue}
                                            onChange={(e) => handleRuleChange(rule, 'core', e.target.checked)}
                                            className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                        />
                                        <label htmlFor={`core-rule-${rule}`} className="ml-2 text-gray-300">{rule}</label>
                                    </div>
                                ))}
                            </div>

                            {Object.keys(optionalRules).map(category => (
                                <div key={category} className="mb-4">
                                    <p className="text-gray-300 font-semibold mb-2">{category} Rules:</p>
                                    {Object.entries(optionalRules[category]).map(([rule, defaultValue]) => (
                                        <div key={rule} className="flex items-center mb-2">
                                            <input
                                                type="checkbox"
                                                id={`${category}-${rule}`}
                                                checked={currentRunRules[rule] !== undefined ? currentRunRules[rule] : defaultValue}
                                                onChange={(e) => handleRuleChange(rule, category, e.target.checked)}
                                                className="form-checkbox h-5 w-5 text-blue-600 rounded"
                                            />
                                            <label htmlFor={`${category}-${rule}`} className="ml-2 text-gray-300">{rule}</label>
                                            {/* Add input for user-definable thresholds if rule implies it */}
                                            {rule === 'Enforce Level Caps' && currentRunRules[rule] && (
                                                <input
                                                    type="number"
                                                    className="ml-4 w-24 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Level"
                                                    value={currentRunRules['Level Cap Value'] || ''}
                                                    onChange={(e) => handleRuleChange('Level Cap Value', category, parseInt(e.target.value) || 0)}
                                                />
                                            )}
                                            {rule === 'Ban Pokémon Above Certain Tier' && currentRunRules[rule] && (
                                                <input
                                                    type="text"
                                                    className="ml-4 w-32 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Tier (e.g., OU)"
                                                    value={currentRunRules['Banned Tier Value'] || ''}
                                                    onChange={(e) => handleRuleChange('Banned Tier Value', category, e.target.value)}
                                                />
                                            )}
                                            {rule === 'Banning Moves Above Certain Base Power' && currentRunRules[rule] && (
                                                <input
                                                    type="number"
                                                    className="ml-4 w-24 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Power"
                                                    value={currentRunRules['Move Base Power Threshold'] || ''}
                                                    onChange={(e) => handleRuleChange('Move Base Power Threshold', category, parseInt(e.target.value) || 0)}
                                                />
                                            )}
                                            {rule === 'Use Only Single-Stage/NFE Pokémon' && currentRunRules[rule] && (
                                                <p className="ml-2 text-sm text-gray-400">(NFE: Not Fully Evolved)</p>
                                            )}
                                            {rule === 'Banning Pokémon of Certain Type' && currentRunRules[rule] && (
                                                <input
                                                    type="text"
                                                    className="ml-4 w-32 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Type (e.g., Fire)"
                                                    value={currentRunRules['Banned Type Value'] || ''}
                                                    onChange={(e) => handleRuleChange('Banned Type Value', category, e.target.value)}
                                                />
                                            )}
                                            {rule === 'Use ONLY Pokémon of Certain Type (Monolocke)' && currentRunRules[rule] && (
                                                <input
                                                    type="text"
                                                    className="ml-4 w-32 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Type (e.g., Water)"
                                                    value={currentRunRules['Monotype Value'] || ''}
                                                    onChange={(e) => handleRuleChange('Monotype Value', category, e.target.value)}
                                                />
                                            )}
                                            {rule === 'Ban Certain Powerful Pokémon' && currentRunRules[rule] && (
                                                <input
                                                    type="text"
                                                    className="ml-4 w-64 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Comma-separated Pokémon names"
                                                    value={currentRunRules['Banned Powerful Pokémon'] || ''}
                                                    onChange={(e) => handleRuleChange('Banned Powerful Pokémon', category, e.target.value)}
                                                />
                                            )}
                                            {rule === 'Cage Match Limit (2)' && currentRunRules[rule] && (
                                                <input
                                                    type="number"
                                                    className="ml-4 w-24 py-1 px-2 text-black bg-gray-200 rounded"
                                                    placeholder="Count"
                                                    value={currentRunRules['Cage Match Limit Value'] || 2}
                                                    onChange={(e) => handleRuleChange('Cage Match Limit Value', category, parseInt(e.target.value) || 0)}
                                                />
                                            )}
                                            {rule === 'Max 2 Pokémon BST > 580' && currentRunRules[rule] && (
                                                <p className="ml-2 text-sm text-gray-400">(Base Stat Total)</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}

                            <div className="flex justify-end mt-6">
                                <button
                                    onClick={saveRuleChanges}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                >
                                    Save Rules
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* Perk Selection Modal */}
                {showPerkModal && pokemonToPerk && (
                    <Modal onClose={() => setShowPerkModal(false)} title={`Give Perk to ${pokemonToPerk.nickname || pokemonToPerk.name}`}>
                        <PerkSelectionForm
                            pokemon={pokemonToPerk}
                            availablePerks={availablePerks}
                            onApplyPerks={handleGivePerk}
                        />
                    </Modal>
                )}

                {/* Link Pokémon Modal */}
                {showLinkPokemonModal && selectedRun && (
                    <Modal onClose={() => setShowLinkPokemonModal(false)} title="Link Pokémon for Soul Link" size="lg">
                        <LinkPokemonModal
                            myPokemonList={[...selectedRun.team, ...selectedRun.pc].filter(p => !p.fainted && p.linkId === null)} // Only un-fainted, unlinked Pokémon
                            partnerPokemonList={[...selectedRun.partnerTeam, ...selectedRun.partnerPc].filter(p => !p.fainted && p.linkId === null)} // Only un-fainted, unlinked Pokémon
                            onLinkPokemon={linkPokemon}
                        />
                    </Modal>
                )}

                {/* Team Configurator Modal */}
                {showTeamConfigModal && selectedRun && (
                    <Modal onClose={() => setShowTeamConfigModal(false)} title="Team Configuration & Compatibility" size="lg">
                        <TeamConfiguratorModal
                            myTeam={[...selectedRun.team]}
                            partnerTeam={[...selectedRun.partnerTeam]}
                            rules={selectedRun.rules}
                            variant={selectedRun.variant}
                        />
                    </Modal>
                )}
            </div>
        </AppContext.Provider>
    );
}

// Modal Component
const Modal = ({ onClose, title, children, size = 'md' }) => {
    const sizeClasses = {
        sm: 'max-w-sm', // Smaller size
        md: 'max-w-md', // Default size
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className={`bg-gray-800 rounded-lg shadow-xl w-full relative ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}>
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(90vh - 65px)' }}> {/* Adjust max-height to account for header/footer */}
                    {children}
                </div>
            </div>
        </div>
    );
};

// Pokemon Form Component (for Add/Edit)
const PokemonForm = ({ pokemon, isAddingNew, onSave, onSearchPokemon, searchResults, loadingPokemonData, pokemonSearchTerm, setPokemonSearchTerm, setSearchResults, allAbilities, allMoves }) => {
    const [name, setName] = useState(pokemon?.name || '');
    const [nickname, setNickname] = useState(pokemon?.nickname || '');
    const [gender, setGender] = useState(pokemon?.gender || ''); // M, F, N
    const [level, setLevel] = useState(pokemon?.level || 1);
    const [ability, setAbility] = useState(pokemon?.ability || '');
    const [types, setTypes] = useState(pokemon?.types || []); // Array of strings
    const [moves, setMoves] = useState(pokemon?.moves || []); // Array of strings
    const [heldItem, setHeldItem] = useState(pokemon?.heldItem || ''); // New held item state
    const [locationCaught, setLocationCaught] = useState(pokemon?.locationCaught || '');
    const [sprite, setSprite] = useState(pokemon?.sprite || '');

    const [filteredAbilities, setFilteredAbilities] = useState([]);
    const [showAbilityDropdown, setShowAbilityDropdown] = useState(false);
    const [filteredMoves, setFilteredMoves] = useState([]);
    const [showMovesDropdown, setShowMovesDropdown] = useState(false);

    useEffect(() => {
        if (pokemon && !isAddingNew) {
            setName(pokemon.name);
            setNickname(pokemon.nickname);
            setGender(pokemon.gender);
            setLevel(pokemon.level);
            setAbility(pokemon.ability);
            setTypes(pokemon.types);
            setMoves(pokemon.moves);
            setHeldItem(pokemon.heldItem || ''); // Set held item when editing
            setLocationCaught(pokemon.locationCaught);
            setSprite(pokemon.sprite);
        } else {
            // Reset form for new Pokemon
            setName('');
            setNickname('');
            setGender('');
            setLevel(1);
            setAbility('');
            setTypes([]);
            setMoves([]);
            setHeldItem(''); // Reset held item for new pokemon
            setLocationCaught('');
            setSprite('');
        }
        // Clear search term and results when modal opens/changes context
        setPokemonSearchTerm('');
        setSearchResults([]); // Use the passed setSearchResults here
    }, [pokemon, isAddingNew, setPokemonSearchTerm, setSearchResults]); // Added missing dependencies

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setPokemonSearchTerm(term);
        if (term.length > 2) { // Search after 2 characters
            onSearchPokemon(term);
        } else {
            setSearchResults([]); // Use the passed setSearchResults here
        }
    };

    const handleSelectSearchResult = (result) => {
        setName(result.name);
        setSprite(result.sprite);
        setTypes(result.types);
        setAbility(result.abilities[0] || ''); // Take first ability by default
        setPokemonSearchTerm(result.name); // Clear search input visually
        setSearchResults([]); // Use the passed setSearchResults here
    };

    const handleAbilityInputChange = (e) => {
        const value = e.target.value;
        setAbility(value);
        if (value.length > 1) {
            setFilteredAbilities(
                allAbilities.filter(a => a.toLowerCase().includes(value.toLowerCase())).slice(0, 10)
            );
            setShowAbilityDropdown(true);
        } else {
            setFilteredAbilities([]);
            setShowAbilityDropdown(false);
        }
    };

    const handleAbilitySelect = (selectedAbility) => {
        setAbility(selectedAbility);
        setShowAbilityDropdown(false);
        setFilteredAbilities([]);
    };

    const handleMovesInputChange = (e) => {
        const value = e.target.value;
        // Allow comma-separated input for multiple moves
        const lastInput = value.split(',').pop().trim();
        setMoves(value.split(',').map(m => m.trim())); // Keep all moves in state

        if (lastInput.length > 1) {
            setFilteredMoves(
                allMoves.filter(m => m.toLowerCase().includes(lastInput.toLowerCase())).slice(0, 10)
            );
            setShowMovesDropdown(true);
        } else {
            setFilteredMoves([]);
            setShowMovesDropdown(false);
        }
    };

    const handleMoveSelect = (selectedMove) => {
        const currentMovesArray = moves.filter(m => m !== ''); // Remove empty strings
        const lastMoveIndex = currentMovesArray.length > 0 ? currentMovesArray.length - 1 : 0;
        const lastInput = currentMovesArray[lastMoveIndex];

        // If the last input matches a partial move, replace it. Otherwise, add a new one.
        if (lastInput && selectedMove.toLowerCase().startsWith(lastInput.toLowerCase())) {
            currentMovesArray[lastMoveIndex] = selectedMove;
        } else {
            currentMovesArray.push(selectedMove);
        }
        setMoves(currentMovesArray);
        setShowMovesDropdown(false);
        setFilteredMoves([]);
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, nickname, gender, level, ability, types, moves: moves.filter(m => m !== ''), heldItem, locationCaught, sprite });
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
                <label htmlFor="pokemonSearch" className="block text-gray-300 text-sm font-bold mb-2">Search Pokémon (PokeAPI):</label>
                <input
                    type="text"
                    id="pokemonSearch"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-black leading-tight focus:outline-none focus:shadow-outline bg-gray-200"
                    value={pokemonSearchTerm}
                    onChange={handleSearchChange}
                    placeholder="e.g., Pikachu"
                />
                {loadingPokemonData && <p className="text-blue-300 text-sm mt-1">Loading...</p>}
                {searchResults.length > 0 && (
                    <div className="mt-2 bg-gray-700 rounded-md max-h-32 overflow-y-auto custom-scrollbar">
                        {searchResults.map((result, index) => (
                            <div
                                key={index}
                                className="p-2 border-b border-gray-600 last:border-b-0 text-gray-200 hover:bg-gray-600 cursor-pointer flex items-center"
                                onClick={() => handleSelectSearchResult(result)}
                            >
                                {result.sprite && <img src={result.sprite} alt={result.name} className="w-8 h-8 mr-2" />}
                                {result.name} ({result.types.join('/')})
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label htmlFor="name" className="block text-gray-300 text-sm font-bold mb-2">Name:</label>
                <input type="text" id="name" className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
                <label htmlFor="nickname" className="block text-gray-300 text-sm font-bold mb-2">Nickname:</label>
                <input type="text" id="nickname" className="input-field" value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div>
                <label htmlFor="gender" className="block text-gray-300 text-sm font-bold mb-2">Gender:</label>
                <select id="gender" className="input-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">♂ Male</option>
                    <option value="Female">♀ Female</option>
                    <option value="Genderless">◇ Genderless</option>
                </select>
            </div>
            <div>
                <label htmlFor="level" className="block text-gray-300 text-sm font-bold mb-2">Level:</label>
                <input type="number" id="level" className="input-field" value={level} onChange={(e) => setLevel(parseInt(e.target.value))} min="1" max="100" />
            </div>
            <div className="relative">
                <label htmlFor="ability" className="block text-gray-300 text-sm font-bold mb-2">Ability:</label>
                <input
                    type="text"
                    id="ability"
                    className="input-field"
                    value={ability}
                    onChange={handleAbilityInputChange}
                    onFocus={() => ability.length > 1 && setShowAbilityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowAbilityDropdown(false), 100)} // Delay to allow click on dropdown
                />
                {showAbilityDropdown && filteredAbilities.length > 0 && (
                    <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full max-h-40 overflow-y-auto custom-scrollbar mt-1">
                        {filteredAbilities.map((item, index) => (
                            <li
                                key={index}
                                className="p-2 text-gray-200 hover:bg-gray-600 cursor-pointer"
                                onMouseDown={() => handleAbilitySelect(item)} // Use onMouseDown to prevent blur before click
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div>
                <label htmlFor="types" className="block text-gray-300 text-sm font-bold mb-2">Types (comma-separated):</label>
                <input type="text" id="types" className="input-field" value={types.join(', ')} onChange={(e) => setTypes(e.target.value.split(',').map(t => t.trim()).filter(t => t))} placeholder="e.g., Fire, Flying" />
            </div>
            <div className="relative">
                <label htmlFor="moves" className="block text-gray-300 text-sm font-bold mb-2">Moves (comma-separated):</label>
                <input
                    type="text"
                    id="moves"
                    className="input-field"
                    value={moves.join(', ')}
                    onChange={handleMovesInputChange}
                    onFocus={() => moves.join(', ').split(',').pop().trim().length > 1 && setShowMovesDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMovesDropdown(false), 100)} // Delay to allow click on dropdown
                    placeholder="e.g., Flamethrower, Fly"
                />
                {showMovesDropdown && filteredMoves.length > 0 && (
                    <ul className="absolute z-10 bg-gray-700 border border-gray-600 rounded-md w-full max-h-40 overflow-y-auto custom-scrollbar mt-1">
                        {filteredMoves.map((item, index) => (
                            <li
                                key={index}
                                className="p-2 text-gray-200 hover:bg-gray-600 cursor-pointer"
                                onMouseDown={() => handleMoveSelect(item)} // Use onMouseDown to prevent blur before click
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            <div>
                <label htmlFor="heldItem" className="block text-gray-300 text-sm font-bold mb-2">Held Item:</label>
                <input type="text" id="heldItem" className="input-field" value={heldItem} onChange={(e) => setHeldItem(e.target.value)} placeholder="e.g., Leftovers" />
            </div>
            <div>
                <label htmlFor="locationCaught" className="block text-gray-300 text-sm font-bold mb-2">Location Caught:</label>
                <input type="text" id="locationCaught" className="input-field" value={locationCaught} onChange={(e) => setLocationCaught(e.target.value)} />
            </div>
            <div>
                <label htmlFor="sprite" className="block text-gray-300 text-sm font-bold mb-2">Sprite URL:</label>
                <input type="text" id="sprite" className="input-field" value={sprite} onChange={(e) => setSprite(e.target.value)} placeholder="Optional: URL to custom sprite" />
            </div>

            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">
                {isAddingNew ? "Add Pokémon" : "Save Changes"}
            </button>
        </form>
    );
};

// Perk Selection Component
const PerkSelectionForm = ({ pokemon, availablePerks, onApplyPerks }) => {
    const [selectedPerks, setSelectedPerks] = useState(pokemon.perks || []);
    const [customPerk, setCustomPerk] = useState('');

    const handleCheckboxChange = (perk) => {
        setSelectedPerks(prev =>
            prev.includes(perk) ? prev.filter(p => p !== perk) : [...prev, perk]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        let perksToApply = [...selectedPerks];
        if (customPerk.trim() && !perksToApply.includes(customPerk.trim())) {
            perksToApply.push(customPerk.trim());
        }
        onApplyPerks(pokemon.id, perksToApply);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <p className="text-gray-300 text-lg mb-3">Select perks for {pokemon.nickname || pokemon.name}:</p>
            <div className="grid grid-cols-1 gap-2">
                {availablePerks.map(perk => (
                    <div key={perk} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`perk-${perk}`}
                            checked={selectedPerks.includes(perk)}
                            onChange={() => handleCheckboxChange(perk)}
                            className="form-checkbox h-5 w-5 text-yellow-500 rounded"
                        />
                        <label htmlFor={`perk-${perk}`} className="ml-2 text-gray-300">{perk}</label>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <label htmlFor="customPerk" className="block text-gray-300 text-sm font-bold mb-2">Custom Perk:</label>
                <input
                    type="text"
                    id="customPerk"
                    className="input-field"
                    value={customPerk}
                    onChange={(e) => setCustomPerk(e.target.value)}
                    placeholder="Enter custom perk description"
                />
            </div>
            <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">
                Apply Perks
            </button>
        </form>
    );
};

// Link Pokemon Modal Component
const LinkPokemonModal = ({ myPokemonList, partnerPokemonList, onLinkPokemon }) => {
    const [selectedMyPokemon, setSelectedMyPokemon] = useState(null);
    const [selectedPartnerPokemon, setSelectedPartnerPokemon] = useState(null);

    const handleLinkClick = () => {
        if (selectedMyPokemon && selectedPartnerPokemon) {
            onLinkPokemon(selectedMyPokemon.id, selectedPartnerPokemon.id);
        } else {
            alert("Please select one Pokémon from your list and one from your partner's list to link.");
        }
    };

    return (
        <div className="p-4">
            <p className="text-gray-300 mb-4">Select one of your Pokémon and one of your partner's Pokémon to link them:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* My Pokémon List */}
                <div className="bg-gray-700 p-3 rounded-md max-h-64 overflow-y-auto custom-scrollbar">
                    <h4 className="text-lg font-semibold text-red-300 mb-2">My Pokémon</h4>
                    {myPokemonList.length === 0 ? (
                        <p className="text-gray-400 text-sm">No unlinked Pokémon in your team or PC.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {myPokemonList.map(pokemon => (
                                <div
                                    key={pokemon.id}
                                    className={`p-2 rounded-md cursor-pointer flex items-center space-x-2 ${selectedMyPokemon?.id === pokemon.id ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                    onClick={() => setSelectedMyPokemon(pokemon)}
                                >
                                    <img
                                        src={pokemon.sprite || `https://placehold.co/40x40/000000/FFFFFF?text=${(pokemon.nickname || pokemon.name).slice(0, 2)}`}
                                        alt={pokemon.name}
                                        className="w-10 h-10 object-contain rounded-full bg-gray-800"
                                    />
                                    <span className="text-white text-sm">{pokemon.nickname || pokemon.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Partner's Pokémon List */}
                <div className="bg-gray-700 p-3 rounded-md max-h-64 overflow-y-auto custom-scrollbar">
                    <h4 className="text-lg font-semibold text-pink-300 mb-2">Partner's Pokémon</h4>
                    {partnerPokemonList.length === 0 ? (
                        <p className="text-gray-400 text-sm">No unlinked Pokémon in partner's team or PC.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {partnerPokemonList.map(pokemon => (
                                <div
                                    key={pokemon.id}
                                    className={`p-2 rounded-md cursor-pointer flex items-center space-x-2 ${selectedPartnerPokemon?.id === pokemon.id ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                                    onClick={() => setSelectedPartnerPokemon(pokemon)}
                                >
                                    <img
                                        src={pokemon.sprite || `https://placehold.co/40x40/000000/FFFFFF?text=${(pokemon.nickname || pokemon.name).slice(0, 2)}`}
                                        alt={pokemon.name}
                                        className="w-10 h-10 object-contain rounded-full bg-gray-800"
                                    />
                                    <span className="text-white text-sm">{pokemon.nickname || pokemon.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 text-center">
                <button
                    onClick={handleLinkClick}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline"
                >
                    Link Selected Pokémon
                </button>
            </div>
        </div>
    );
};

// Team Configurator Modal Component
const TeamConfiguratorModal = ({ myTeam, partnerTeam, rules, variant }) => {
    const getTeamCompatibilityMessages = () => {
        const messages = [];

        // Rule: No Shared Types in Party (Primary Types Only)
        if (variant === 'Soul Link' && rules['No Shared Types in Party (Primary Types Only)']) {
            const myPrimaryTypes = new Set(myTeam.map(p => p.types?.[0]).filter(Boolean));
            const partnerPrimaryTypes = new Set(partnerTeam?.map(p => p.types?.[0]).filter(Boolean));

            const sharedTypes = [...myPrimaryTypes].filter(type => partnerPrimaryTypes.has(type));

            if (sharedTypes.length > 0) {
                messages.push(`🚫 Soul Link Type Conflict: Your team and your partner's team share primary types: ${sharedTypes.join(', ')}.`);
            } else {
                messages.push('✅ Soul Link Type Compatibility: No shared primary types detected between your teams.');
            }
        }

        // Rule: No Shared Types in Party (for non-Soul Link Uniquelocke, secondary types count)
        if (variant === 'Uniquelocke' || (variant !== 'Soul Link' && rules['No Shared Types in Party'])) {
            const allMyTypes = new Set();
            myTeam.forEach(p => {
                p.types?.forEach(type => allMyTypes.add(type));
            });

            const duplicateMyTypes = Array.from(allMyTypes).filter(type => {
                return myTeam.filter(p => p.types?.includes(type)).length > 1;
            });

            if (duplicateMyTypes.length > 0) {
                messages.push(`🚫 Team Type Conflict: Your team has duplicate types: ${duplicateMyTypes.join(', ')}.`);
            } else {
                messages.push('✅ Team Type Compatibility: No duplicate types in your team.');
            }
        }


        if (messages.length === 0) {
            messages.push("No specific team compatibility rules are active or no issues found.");
        }

        return messages;
    };

    const compatibilityMessages = getTeamCompatibilityMessages();

    return (
        <div className="p-4">
            <h3 className="text-xl font-semibold mb-3 text-cyan-300">Current Team Status:</h3>
            <div className="space-y-2">
                {compatibilityMessages.map((msg, index) => (
                    <p key={index} className={`p-2 rounded-md ${msg.startsWith('🚫') ? 'bg-red-800 text-red-200' : 'bg-green-800 text-green-200'}`}>
                        {msg}
                    </p>
                ))}
            </div>
            {/* Future enhancements: suggestions, detailed breakdown */}
        </div>
    );
};


// Pokemon Card Component
const PokemonCard = ({ pokemon, onEdit, onMoveToPc, onMoveToTeam, onFaint, onRevive, onRelease, onGivePerk, isFainted, isPartner, currentList }) => {
    const getGenderSymbol = (gender) => {
        if (gender === 'Male') return '♂';
        if (gender === 'Female') return '♀';
        return '';
    };

    return (
        <div className={`relative bg-gray-900 rounded-md shadow-md p-2 flex flex-col items-center justify-center text-center group ${isFainted ? 'opacity-50 grayscale' : ''} ${isPartner ? 'border-2 border-indigo-500' : ''}`}>
            <img
                src={pokemon.sprite || `https://placehold.co/96x96/000000/FFFFFF?text=${(pokemon.nickname || pokemon.name).slice(0, 3)}`}
                alt={pokemon.nickname || pokemon.name}
                className="w-24 h-24 object-contain mb-2 bg-gray-800 rounded-full border-2 border-gray-700"
                onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/96x96/000000/FFFFFF?text=${(pokemon.nickname || pokemon.name).slice(0, 3)}`; }}
            />
            <p className="text-lg font-semibold text-white">{pokemon.nickname || pokemon.name} {getGenderSymbol(pokemon.gender)}</p>
            <p className="text-sm text-gray-400">Lvl: {pokemon.level}</p>

            {/* Held Item Icon */}
            {pokemon.heldItem && (
                <div className="absolute top-1 left-1 w-6 h-6 z-10" title={pokemon.heldItem}>
                    {/* Using the provided dire-hit.png for held item */}
                    <img src="dire-hit.png" alt="Held Item" className="w-full h-full object-contain" />
                </div>
            )}

            {/* Perk Icon (Star) */}
            {pokemon.perks && pokemon.perks.length > 0 && (
                <div className="absolute top-1 right-1 w-6 h-6 z-10" title={`Perks: ${pokemon.perks.join(', ')}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="gold" stroke="currentColor" strokeWidth="1" className="w-full h-full">
                        <path fillRule="evenodd" d="M10.788 3.212a.75.75 0 011.424 0l.338 1.037a.75.75 0 00.572.417l1.086.157a.75.75 0 01.417 1.28l-.78.757a.75.75 0 00-.22.68l.184 1.077a.75.75 0 01-1.092.795l-.963-.505a.75.75 0 00-.698 0l-.963.505a.75.75 0 01-1.092-.795l.184-1.077a.75.75 0 00-.22-.68l-.78-.757a.75.75 0 01.417-1.28l1.086-.157a.75.75 0 00.572-.417l.338-1.037z" clipRule="evenodd" />
                    </svg>
                </div>
            )}

            {/* Linked Icon (Numerical) */}
            {pokemon.linkId !== null && pokemon.linkId !== undefined && (
                <div className="absolute bottom-1 left-1 w-6 h-6 z-10 flex items-center justify-center bg-blue-500 rounded-full text-white text-xs font-bold" title={`Linked ID: ${pokemon.linkId}`}>
                    {pokemon.linkId}
                </div>
            )}

            {/* Hover/Click Actions */}
            {!isPartner && (
                <div className="absolute inset-0 bg-black bg-opacity-70 rounded-md flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!isFainted ? (
                        <>
                            <button
                                onClick={onEdit}
                                className="text-blue-400 hover:text-blue-300 text-sm mb-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                            >
                                Edit
                            </button>
                            {currentList === 'team' && (
                                <button
                                    onClick={onMoveToPc}
                                    className="text-yellow-400 hover:text-yellow-300 text-sm mb-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                                >
                                    Move to PC
                                </button>
                            )}
                            {currentList === 'pc' && (
                                <button
                                    onClick={onMoveToTeam}
                                    className="text-red-400 hover:text-red-300 text-sm mb-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                                >
                                    Move to Team
                                </button>
                            )}
                            <button
                                onClick={onFaint}
                                className="text-red-500 hover:text-red-400 text-sm px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                            >
                                Mark Fainted
                            </button>
                            {onGivePerk && (
                                <button
                                    onClick={onGivePerk}
                                    className="text-purple-400 hover:text-purple-300 text-sm mb-1 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                                >
                                    Give Perk
                                </button>
                            )}
                            <button
                                onClick={onRelease}
                                className="text-gray-400 hover:text-gray-300 text-sm px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                            >
                                Release
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onRevive}
                                className="text-emerald-400 hover:text-emerald-300 text-sm px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                            >
                                Revive
                            </button>
                            <button
                                onClick={onRelease}
                                className="text-gray-400 hover:text-gray-300 text-sm px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600"
                            >
                                Release
                            </button>
                        </>
                    )}
                </div>
            )}
            {/* Tooltip on hover */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                <p>Ability: {pokemon.ability || 'N/A'}</p>
                <p>Type: {pokemon.types?.join(', ') || 'N/A'}</p>
                <p>Moves: {pokemon.moves?.join(', ') || 'N/A'}</p>
                <p>Held Item: {pokemon.heldItem || 'N/A'}</p>
                <p>Location: {pokemon.locationCaught || 'N/A'}</p>
                {pokemon.perks && pokemon.perks.length > 0 && (
                    <p>Perks: {pokemon.perks.join(', ')}</p>
                )}
                {pokemon.linkId !== null && pokemon.linkId !== undefined && (
                    <p className="text-blue-300">Linked ID: {pokemon.linkId}</p>
                )}
            </div>
        </div>
    );
};

export default App;

