export interface SampleSource {
  id: string;
  title: string;
  author: string;
  genre: string;
  recommendedStyle: 'classic_otr' | 'bbc_theatre' | 'modern_cinematic' | 'noir_detective' | 'gothic_horror' | 'sci_fi_pulp';
  teaser: string;
  suggestedPages: number;
  text: string;
}

export const SAMPLE_SOURCES: SampleSource[] = [
  {
    id: 'war-of-the-worlds',
    title: 'The War of the Worlds (The Cylinder at Grover\'s Mill)',
    author: 'H. G. Wells',
    genre: 'Vintage Sci-Fi / Panic Broadcast',
    recommendedStyle: 'sci_fi_pulp',
    teaser: 'A meteor falls in a New Jersey farmstead, unscrewing with an icy metallic screech. The quintessential radio drama.',
    suggestedPages: 8,
    text: `No one would have believed in the last years of the nineteenth century that this world was being watched keenly and closely by intelligences greater than man's and yet as mortal as his own.

It was on Friday night that the meteor fell. It fell in the pine woods near Grover's Mill. Henderson, the news journalist, rushed out to see it first. The thing itself was almost entirely buried in sand, amid the scattered splinters of a fir tree. The uncovered part looked like a huge cylinder, caked over and its outline softened by a thick scaly dun-colored incrustation. It had a diameter of about thirty yards.

A crowd had gathered along the edge of the pit: farm folk, women in shawls, boys on bicycles, all whispering and pointing.
"Keep back! Keep back!" cried Ogilvy, the astronomer, waving his hands in frantic alarm. "It's scorching hot! You have no idea what is inside!"

Suddenly, a strange muffled scraping sound came from within the cylinder. The crowd went dead silent.
A circular piece of the top was unscrewing. Slowly, ponderously, two feet of shining screw thread emerged from the casing.
"Good heavens," gasped Ogilvy, his spectacles fogging in the chill evening air. "There is something inside. Men... or things from space. They are unfastening the hatch!"

A sharp clatter echoed as the lid fell outward with a heavy metallic clang into the gravel. From the black aperture stepped... no, not a man. Two luminous eyes, dark and pulsing, stared out from the pit. A grayish rounded bulk, the size of a bear, rose slowly into the moonlight. A slender tentacle whipped into the night air with the sound of cracking whipcord.

Then came the flash. A pale, blinding beam of silent ghost-fire swept across the line of onlookers. Where men stood a moment before, only crackling embers and scorched air remained.`
  },
  {
    id: 'tell-tale-heart',
    title: 'The Tell-Tale Heart',
    author: 'Edgar Allan Poe',
    genre: 'Gothic Psychological Horror',
    recommendedStyle: 'gothic_horror',
    teaser: 'True!—nervous—very, very dreadfully nervous I had been and am; but why will you say that I am mad?',
    suggestedPages: 6,
    text: `TRUE!—nervous—very, very dreadfully nervous I had been and am; but why will you say that I am mad? The disease had sharpened my senses—not destroyed—not dulled them. Above all was the sense of hearing acute. I heard all things in the heaven and in the earth. I heard many things in hell. How, then, am I mad? Hearken! and observe how healthily—how calmly I can tell you the whole story.

It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me. He had never given me insult. For his gold I had no desire. I think it was his eye! yes, it was this! He had the eye of a vulture—a pale blue eye, with a film over it. Whenever it fell upon me, my blood ran cold; and so by degrees—very gradually—I made up my mind to take the life of the old man, and thus rid myself of the eye forever.

Now this is the point. You fancy me mad. Madmen know nothing. But you should have seen me. You should have seen how wisely I proceeded—with what caution—with what foresight—with what dissimulation I went to work! I was never kinder to the old man than during the whole week before I killed him. And every night, about midnight, I turned the latch of his door and opened it—oh so gently!

On the eighth night, I was more than usually cautious in opening the door. A watch's minute hand moves more quickly than did mine. My thumb slipped upon the tin fastening, and the old man sprang up in bed, crying out—"Who's there?"
I kept quite still and said nothing. For a whole hour I did not move a muscle.
And now have I not told you that what you mistake for madness is but over-acuteness of the senses?—now, I say, there came to my ears a low, dull, quick sound, such as a watch makes when enveloped in cotton. I knew that sound well, too. It was the beating of the old man's heart. It increased my fury, as the beating of a drum stimulates the soldier into courage.`
  },
  {
    id: 'hound-baskervilles',
    title: 'The Hound of the Baskervilles',
    author: 'Sir Arthur Conan Doyle',
    genre: 'Atmospheric Victorian Mystery',
    recommendedStyle: 'bbc_theatre',
    teaser: 'A hound it was, an enormous coal-black hound, but not such a hound as mortal eyes have ever seen.',
    suggestedPages: 8,
    text: `The moor was very dark and silent under the drifting mantle of yellow fog. We stood upon the edge of the great Grimpen Mire, Watson and I, while Inspector Lestrade of Scotland Yard crouched beside us in the wet heather with his service revolver uncocked in his trembling palm.

"Look, Holmes!" whispered Watson, catching my arm. "The fog bank is rolling over the house! If Sir Henry comes out now, he will not see his way across the causeway!"

At that instant, from the heart of the creeping white vapor, there came a sound. Not a footstep. Not the cry of a night bird.
It was a long, deep, quavering bay. A sound of blood and cold iron that chilled the marrow in our bones.
"Merciful heavens!" Lestrade gasped, sinking to his knees. "What was that?"

"Hush, man! Keep low!" I hissed, leveling my pistol into the fog.
The sound drew nearer—a wet, rapid pad-pad-pad of heavy paws splashing through peat moss. The fog rifted for ten yards before us.
And then, out of the white veil, leaped the creature.
A hound it was, an enormous coal-black hound, but not such a hound as mortal eyes have ever seen. Fire burst from its open mouth, its eyes glowed with a smouldering glare, its muzzle and hackles and dewlap were outlined in flickering flame! Never in the delirious dream of a disordered brain could anything more savage, more appalling, more hellish be conceived than that dark form and savage face which broke upon us out of the fog.`
  },
  {
    id: 'dracula',
    title: 'Dracula (Arrival at the Borgo Pass)',
    author: 'Bram Stoker',
    genre: 'Classic Gothic Horror',
    recommendedStyle: 'gothic_horror',
    teaser: 'The howling of the wolves seemed to become closer and closer, through the pitch-black Carpathian night.',
    suggestedPages: 7,
    text: `3 May. Bistritz.—Left Munich at 8:35 P.M., on 1st May, arriving at Vienna early next morning; should have arrived at 6:46, but train was an hour late. The grey of the morning had passed, and the sun was high over the distant horizon, which seemed jagged, whether with trees or hills I know not.

The Borgo Pass at midnight was shrouded in deep, brooding darkness. The calèche with four black horses drew up beside the rocky crags. The driver of my post-chaise looked around in terror.
"He is not here!" cried my driver. "There is no carriage from the Castle! Come back with us to Bukovina!"
"No," I replied, gripping my valise. "Count Dracula expects me."

Just then, through the swirl of falling snowflakes, a tall caleche emerged drawn by four coal-black steeds. The driver was a tall man, with a long brown beard and a great black hat, which seemed to hide his face from us. I could see only the gleam of a pair of very bright eyes, which seemed red in the lamplight.

"Welcome to my carriage, Herr Harker," the strange driver said in a voice harsh as iron scraping stone. "The night is cold, and my Master awaits."
As I climbed inside, the carriage lurched into the abyss. All around us, from the pine forests, rose a chorus of wolves—not far away, but hemming in the road on every side.`
  },
  {
    id: 'maltese-shadow',
    title: 'The Shadow of Midnight (P.I. Case)',
    author: 'Radio Noir Original',
    genre: '1940s Hardboiled Detective Noir',
    recommendedStyle: 'noir_detective',
    teaser: 'The rain outside my fourth-floor office window was coming down like cheap gin. Then she walked in with a nickel-plated revolver.',
    suggestedPages: 6,
    text: `The rain against the frosted glass of my office door sounded like someone throwing handfuls of dried peas against a coffin. It was past two in the morning, and the neon sign of the King Cole Diner across the wet street was buzzing in B-flat, bathing my scarred desk in electric blood.

I poured three fingers of rye into a paper cup that had seen better Tuesdays.
The doorknob rattled.
I didn't reach for my snub-nosed .38. In this town, anyone who rattles a doorknob at two in the morning usually doesn't have the brains to pull a trigger first.

The door swung open with a screech of rusted brass.
She was wrapped in an emerald silk trench coat that looked like it had cost more than my last three homicide retainers put together. Her veil was dripping wet, but her eyes were dry as powdered bone.
"Mr. Vance?" Her voice was low, velvet wrapped around a switchblade.
"Depends on who's asking, lady. If you're selling life insurance, you're five minutes too late."
She closed the door behind her with the heel of a high-heeled pump, clicked the deadbolt into place, and dropped a velvet jeweler's pouch onto my blotter.
"I don't need insurance, Vance. I need an alibi for a murder that's going to happen at dawn."`
  }
];
