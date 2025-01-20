import {
    composeContext,
    elizaLogger,
    generateObject,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    type Action,
} from "@elizaos/core";
import { validateBeatsFoundationConfig } from "../../environment.js";
import { getSongsExamples } from "./examples.js";
import { createSongsService } from "./service.js";
import { getSongsTemplate } from "./template.js";
import { GetSongsContent } from "./types.js";
import { isGetSongsContent } from "./validation.js";

export default {
    name: "GET_SONGS",
    similes: ["LIST_SONGS", "FETCH_SONGS", "SHOW_SONGS"],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        await validateBeatsFoundationConfig(runtime);
        return true;
    },
    description: "Get a list of songs from Beats Foundation",
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ): Promise<boolean> => {
        elizaLogger.log("Starting Beats Foundation GET_SONGS handler...");

        // Initialize or update state
        if (!state) {
            state = (await runtime.composeState(message)) as State;
        } else {
            state = await runtime.updateRecentMessageState(state);
        }

        try {
            // Compose and generate content
            const context = composeContext({
                state,
                template: getSongsTemplate,
            });

            const content = (await generateObject({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            })) as unknown as GetSongsContent;

            // Validate content
            if (!isGetSongsContent(content)) {
                throw new Error("Invalid songs content");
            }

            // Get config with validation
            const config = await validateBeatsFoundationConfig(runtime);
            const songsService = createSongsService(config.BEATSFOUNDATION_API_KEY);

            try {
                const result = await songsService.getSongs(content.limit, content.offset);
                elizaLogger.success(
                    `Songs retrieved successfully! Count: ${result.data.length}, Total: ${result.pagination.total}`
                );

                if (callback) {
                    callback({
                        text: `Retrieved ${result.data.length} songs (Total: ${result.pagination.total})`,
                        content: result,
                    });
                }

                return true;
            } catch (error: any) {
                elizaLogger.error("Error in GET_SONGS handler:", error);
                if (callback) {
                    callback({
                        text: `Error fetching songs: ${error.message}`,
                        content: { error: error.message },
                    });
                }
                return false;
            }
        } catch (error: any) {
            elizaLogger.error("Error in GET_SONGS handler:", error);
            if (callback) {
                callback({
                    text: `Error fetching songs: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    examples: getSongsExamples,
} satisfies Action;
