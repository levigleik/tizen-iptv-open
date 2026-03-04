import Image from "next/image";

import { LayoutShell } from "@/components/iptv/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const CONTINUE_WATCHING = [
	{
		title: "The Batman",
		description: "1h 45m remaining",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuAn16K4CxlNPM5J53UWI1_1ifb1fRs1ftyKao1BTXD2DnJAFDOtqdL5JjUDx9DVPkd_zPTtFXfVe9oez5HVb0MqrvNo3IT2TjVcyRMKM2hxdwx1HIe9F01dReJEGwrnR17iDsmpp9-YqCMQKR0YT5CM3SiIdJb_CogiO7mfwZGgXux50eZAXyA8SCoegjJpclTBAHhQC67_URclLXkhQZm5-m6pLn3lH1kInB7GW1m9Pq-_zOqLPvqKoxcce8EIMnD4wSl91ZW4ah4n",
		progressWidth: "w-2/3",
	},
	{
		title: "The Matrix Resurrections",
		description: "S1:E3 • 22m remaining",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuDK3_2AnsukDHhJ4hUQvOuM7bvpJxTlshPTQbfKuhnIoMXvYIzuRZy2YAqB4jxSSdLRp23f_38Yk0cdAsxxUxGdCHgMfNHOSyNeVjlWCHg0vEES5kNzzFctU69k31AYJdOai8v2--d6oQk49GZLWqCtWE6VvF7-UXG-UEr_iwT4pVCvDeTT0vwr3DrHnGPdTdp9NZBphXMg58XH20EfQwFoCtHxvJHwIEcTk4z6aEWgaiPjd8stSpGkJnDPB770OM4C4VvLxMnHAtGv",
		progressWidth: "w-1/4",
	},
];

const TOP_RATED = [
	{
		title: "Interstellar",
		description: "Sci-Fi • 2014",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuAqEQxv2ApP12P-s0q0MvYk9ONjjIbc7kYW-zbq6z7_yev05VfQHaw1PTcxbXkbn3dWDnaUihL72e3tRV79bnD9jktV9i2R_5kz9Kgv34jSEW2pGHDW5QHcZ2MVG14YfCNkRna7E8LsjY3IcNJGQkxgM2JPA-J8d4wY6hh2Ht3g-aEl6ESoHDtI6F1cBGjyDCukISpVv71rghnC5GnT1ZcbBCiXcl-z3T-ZHJPTiqSPxoV4xdR09a6zp3mmTmvb1h5LwarOufir18kr",
		badges: ["4K", "HDR"],
		leftBadge: null,
	},
	{
		title: "Dune: Part One",
		description: "Sci-Fi • 2021",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuA3LB_vT-B01tSNclI9t6I6Ilbn3sD6643Wnwb-fY2YrCkp0gDXy5jcATb2JWI80upUafuY1vzZaNszJyDJv05FpD_IhRI6pu7s0UpsOziNcsN-i1n8cFhmvAu8B7cXFvLjLzT6vOrsItab5fXOPo_9hV67XOFIMbYiK_8HYh8g2yNqjkNJzviDkJoLm5zAkG_eTdzB6PDzyIaimr0OH_4IWlJ48DIn716DbtPua86UXirjijRMqgt0w3EhoEBm1-sb9dMaYGhAnAs3",
		badges: ["FHD"],
		leftBadge: null,
	},
	{
		title: "Blade Runner 2049",
		description: "Drama • 2017",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuADzNUTRdha0rtZZMkuvn-AFB6R18lHQ5QTiARO0fH8ARhShbNLgIxPZh0M5TTY-AoD8n7Zvk6QYFhU1R0oAFr2sTs6kCuRebTmQzic2uoFVie2eVmN0dbLIErznTUJcq9NtyjA87z4vMS2fTQV7eb7N8KsH3t5V1OPhzRN6zT9-95jMhY3xFFlQm3prSbmPVaO11s8AWJCelbh2cNQmxYpfQAOc-IetpfCzO9u-B5VFgtoxMihKwj_G2mNDXMfr03UADzlEe7R52bR",
		badges: ["FHD"],
		leftBadge: null,
	},
	{
		title: "Spider-Man: No Way Home",
		description: "Adventure • 2021",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuA6tsEvdvRGbuXAKtsVDZbJ-V2WrA15rv7bCopcd52Jrw9IpWZALN_LaMJgqO7GPm7ezGlG8KltLGZNUpqdaQFF0dQNbNMfCzsCo6xkX_WlWn8cyyJ7bjtBDVdK4CiWuM8_x5U01ZhixwaPePdK3lFqCvXVNWQc8qmrC7_QFHdy4F9o-gHVLQfkgC8s-6Uq7JIA0OD4FkAA07b_Vdv2G01gDM5zTtP1mBCRfYhvtqqrRabJvoD8ynkR7yuqzejgRDYlTgT8cP7iRY-e",
		badges: ["4K"],
		leftBadge: "[L]",
	},
	{
		title: "Jurassic World: Domínio",
		description: "Action • 2022",
		image:
			"https://lh3.googleusercontent.com/aida-public/AB6AXuAohoGVV0mFQ1WveMHjJIuWHz_jXh-93w_Pv1NGoanHa4d2awe2xLOWq4Di9LJuqCPJ4gaywzemWYYWg-Hw-HfJMLCxLhDoYYUMhZoxaJChY5ZNtKPwceu6zTO3WBI398jkW7mw7SealhF2oWz3OZSmS6jARnHpMshPSRYtpiXurU-6_iiTSLS5bejmLqzPJNGmbVl7dweRrZHaxsrqzrSerSJgC0yFx6CvfzMysZU5MhnS3e_XTu-YJZPzFQDg7tRmJp6UFrnVG56N",
		badges: ["4K", "HDR"],
		leftBadge: "[L]",
	},
];

export default function Home() {
	return (
		<LayoutShell activeSidebarItem="home">
			<main className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
				<header className="h-20 shrink-0 border-b border-transparent backdrop-blur flex items-center justify-between px-6 z-30 absolute top-0 w-full bg-transparent">
					<div className="flex items-center gap-4 flex-1">
						<div className="relative w-full max-w-md group hidden md:block opacity-0">
							<span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
								search
							</span>
							<Input
								className="w-full rounded-full bg-secondary/50 pl-10"
								placeholder="Search..."
								type="text"
							/>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Button
							className="rounded-full w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur text-white hover:bg-white/20 transition-colors border border-white/10"
							type="button"
							variant="ghost"
						>
							<span className="material-symbols-outlined">search</span>
						</Button>
						<Button
							className="rounded-full w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur text-white hover:bg-white/20 transition-colors border border-white/10"
							type="button"
							variant="ghost"
						>
							<span className="material-symbols-outlined">notifications</span>
						</Button>
						<Button
							className="rounded-full w-10 h-10 flex items-center justify-center bg-primary text-white border border-white/10 overflow-hidden"
							type="button"
							variant="ghost"
						>
							<Image
								alt="User"
								height={40}
								src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWbRUZCyO_UVXljOLuUz3FUOb4LrLK2c-N3nEPNPh6gFLeSPRIjaSmW4fJVgwloFpgzghN8fOLl2JAFY6jF6Kt7bX0vu5jIvQtEeo_I5ZSkwB-1cWxZMutt9-Hw-lhpKuE_-bLTro60B4RXnxiPS99YdSWcedIKh-tWEIPV5gGIto2fgxUGNgIgoNcAyt4XSS3DmSkdMVmC0TPStL0xkpLtDEm0HGXpDbhfoQDjJTcD6_rvACw09tWULkyMDtRa64YbiwduF7A9aJs"
								width={40}
							/>
						</Button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto scroll-smooth hide-scrollbar relative z-10">
					<div className="hero-banner">
						<div className="hero-overlay" />
						<div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 lg:p-16 z-10 w-full md:w-2/3 lg:w-1/2">
							<div className="flex items-center gap-2 mb-3">
								<Badge
									className="bg-yellow-500/90 text-black uppercase tracking-wider"
									variant="outline"
								>
									IMDb 8.6
								</Badge>
								<Badge
									className="border-white/30 text-white/90"
									variant="outline"
								>
									2023
								</Badge>
								<Badge
									className="border-white/30 text-white/90"
									variant="outline"
								>
									180 min
								</Badge>
								<Badge
									className="border-white/30 text-white/90"
									variant="outline"
								>
									4K UHD
								</Badge>
							</div>
							<h1 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight text-white mb-4 leading-tight drop-shadow-lg">
								Oppenheimer
							</h1>
							<p className="text-sm md:text-base text-gray-300 mb-8 line-clamp-3 md:line-clamp-none max-w-xl text-shadow">
								The story of American scientist J. Robert Oppenheimer and his
								role in the development of the atomic bomb. A cinematic
								masterpiece exploring the brilliant mind and moral dilemmas of
								the man who changed the world forever.
							</p>
							<div className="flex flex-wrap items-center gap-4">
								<Button
									className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-black px-8 py-3 text-sm font-bold shadow-lg hover:bg-gray-200 focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all hover:scale-105 active:scale-95"
									type="button"
									variant="ghost"
								>
									<span className="material-symbols-outlined text-xl">
										play_arrow
									</span>
									Watch Now
								</Button>
								<Button
									className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 text-sm font-semibold shadow-sm hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all hover:scale-105 active:scale-95"
									type="button"
									variant="ghost"
								>
									<span className="material-symbols-outlined text-xl">add</span>
									My List
								</Button>
								<Button
									className="inline-flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 w-12 h-12 shadow-sm hover:bg-white/20 focus:outline-none focus:ring-4 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all hover:scale-105 active:scale-95"
									type="button"
									variant="ghost"
								>
									<span className="material-symbols-outlined text-xl">
										info
									</span>
								</Button>
							</div>
						</div>
					</div>

					<div className="px-6 md:px-8 pb-12 -mt-8 relative z-20 space-y-10">
						<section>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
									Continue Watching
								</h2>
								<Button
									className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1 group"
									type="button"
									variant="ghost"
								>
									View All
									<span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
										arrow_forward
									</span>
								</Button>
							</div>

							<div className="horizontal-scroll hide-scrollbar">
								{CONTINUE_WATCHING.map((item) => (
									<Card
										className="movie-card group flex flex-col gap-2 border-none bg-transparent p-1 shadow-none flex"
										key={item.title}
									>
										<div className="movie-poster-container bg-muted aspect-video pb-[56.25%]">
											<Image
												alt={item.title}
												className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
												fill
												loading="lazy"
												sizes="(min-width: 768px) 200px, (min-width: 640px) 180px, 160px"
												src={item.image}
											/>
											<div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
											<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
												<Button
													className="h-12 w-12 rounded-full bg-primary/90 p-0"
													type="button"
												>
													<span className="material-symbols-outlined text-3xl ml-1">
														play_arrow
													</span>
												</Button>
											</div>
											<div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
												<div
													className={`h-full bg-primary ${item.progressWidth}`}
												/>
											</div>
										</div>
										<div className="flex flex-col">
											<h3 className="font-medium text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors group-focus:text-primary">
												{item.title}
											</h3>
											<p className="text-xs text-muted-foreground truncate mt-0.5">
												{item.description}
											</p>
										</div>
									</Card>
								))}
							</div>
						</section>

						<section>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-bold tracking-tight text-foreground">
									Top Rated Movies
								</h2>
								<Button
									className="text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1 group"
									type="button"
									variant="ghost"
								>
									View All
									<span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
										arrow_forward
									</span>
								</Button>
							</div>

							<div className="horizontal-scroll hide-scrollbar">
								{TOP_RATED.map((item) => (
									<Card
										className="movie-card group flex flex-col gap-2 border-none bg-transparent p-1 shadow-none"
										key={item.title}
									>
										<a
											className="outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg"
											href="#"
										>
											<div className="movie-poster-container bg-muted">
												<Image
													alt={item.title}
													className="movie-poster transition-transform duration-300 group-hover:scale-105 group-focus:scale-105"
													fill
													loading="lazy"
													sizes="(min-width: 768px) 200px, (min-width: 640px) 180px, 160px"
													src={item.image}
												/>
												<div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
													{item.badges.map((badge) => (
														<Badge
															className={
																badge === "HDR"
																	? "bg-blue-600/90 text-white border-white/10 uppercase tracking-wider"
																	: "bg-black/80 text-white border-white/10 uppercase tracking-wider"
															}
															key={`${item.title}-${badge}`}
															variant="outline"
														>
															{badge}
														</Badge>
													))}
												</div>
												{item.leftBadge ? (
													<div className="absolute top-2 left-2">
														<Badge
															className="bg-yellow-500/90 text-black uppercase tracking-wider"
															variant="outline"
														>
															{item.leftBadge}
														</Badge>
													</div>
												) : null}
												<div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200 movie-poster-overlay flex items-center justify-center backdrop-blur-[2px]">
													<Button
														className="h-12 w-12 rounded-full bg-primary/90 p-0"
														type="button"
													>
														<span className="material-symbols-outlined text-3xl ml-1">
															play_arrow
														</span>
													</Button>
												</div>
											</div>
											<div className="flex flex-col">
												<h3 className="font-medium text-sm leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors group-focus:text-primary">
													{item.title}
												</h3>
												<p className="text-xs text-muted-foreground truncate mt-0.5">
													{item.description}
												</p>
											</div>
										</a>
									</Card>
								))}
							</div>
						</section>
					</div>
				</div>
			</main>
		</LayoutShell>
	);
}
