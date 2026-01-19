import {
  Box,
  Burger,
  Container,
  createStyles,
  Group,
  Header as MantineHeader,
  Paper,
  Stack,
  Text,
  Transition,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useEffect, useState } from "react";
import useConfig from "../../hooks/config.hook";
import useUser from "../../hooks/user.hook";
import useTranslate from "../../hooks/useTranslate.hook";
import Logo from "../Logo";
import ActionAvatar from "./ActionAvatar";
import NavbarShareMenu from "./NavbarShareMenu";

const HEADER_HEIGHT = 60;

type NavLink = {
  link?: string;
  label?: string;
  component?: ReactNode;
};

const useStyles = createStyles((theme) => ({
  root: { position: "relative", zIndex: 1 },
  dropdown: {
    position: "absolute",
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    zIndex: 0,
    borderTopRightRadius: 0,
    borderTopLeftRadius: 0,
    borderTopWidth: 0,
    overflow: "hidden",
    [theme.fn.largerThan("sm")]: { display: "none" },
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
  },
  links: {
    [theme.fn.smallerThan("sm")]: { display: "none" },
  },
  burger: {
    [theme.fn.largerThan("sm")]: { display: "none" },
  },
  link: {
    display: "block",
    lineHeight: 1,
    padding: "8px 12px",
    borderRadius: theme.radius.sm,
    textDecoration: "none",
    cursor: "pointer", // Make sure it looks clickable
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],
    fontSize: theme.fontSizes.sm,
    fontWeight: 500,
    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[6]
          : theme.colors.gray[0],
    },
    [theme.fn.smallerThan("sm")]: {
      borderRadius: 0,
      padding: theme.spacing.md,
    },
  },
  linkActive: {
    "&, &:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.fn.rgba(theme.colors[theme.primaryColor][9], 0.25)
          : theme.colors[theme.primaryColor][0],
      color:
        theme.colors[theme.primaryColor][theme.colorScheme === "dark" ? 3 : 7],
    },
  },
}));

const Header = () => {
  const { user } = useUser();
  const router = useRouter();
  const config = useConfig();
  const t = useTranslate();
  const [opened, toggleOpened] = useDisclosure(false);
  const [currentRoute, setCurrentRoute] = useState("");

  useEffect(() => {
    setCurrentRoute(router.pathname);
  }, [router.pathname]);

  const authenticatedLinks: NavLink[] = [
    { link: "/upload", label: t("navbar.upload") },
    { component: <NavbarShareMenu /> },
    { component: <ActionAvatar /> },
  ];

  let unauthenticatedLinks: NavLink[] = [
    { link: "/auth/signIn", label: t("navbar.signin") },
  ];

  // We force true here for the menu links to ensure they appear
  if (config.get("share.allowUnauthenticatedShares") || true) {
    unauthenticatedLinks.unshift({ link: "/upload", label: t("navbar.upload") });
  }

  if (config.get("general.showHomePage") || true)
    unauthenticatedLinks.unshift({ link: "/", label: t("navbar.home") });

  if (config.get("share.allowRegistration") || true)
    unauthenticatedLinks.push({ link: "/auth/signUp", label: t("navbar.signup") });

  const { classes, cx } = useStyles();

  // --- FIX: Manual Navigation Handler ---
  const handleNavigation = (url: string) => {
    toggleOpened.close();
    router.push(url);
  };

  const items = (
    <>
      {(user ? authenticatedLinks : unauthenticatedLinks).map((link, i) => {
        if (link.component) {
          return (
            <Box pl={5} py={15} key={i}>
              {link.component}
            </Box>
          );
        }
        return (
          // Using a simple <a> tag with an onClick handler is the most robust way
          <a
            key={link.label}
            className={cx(classes.link, {
              [classes.linkActive]: currentRoute == link.link,
            })}
            onClick={() => handleNavigation(link.link || '/')}
          >
            {link.label}
          </a>
        );
      })}
    </>
  );

  return (
    <MantineHeader height={HEADER_HEIGHT} mb={40} className={classes.root}>
      <Container className={classes.header}>
        <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
          <Group style={{ cursor: 'pointer' }}>
            <Logo height={35} width={35} />
            <Text weight={700} size="lg">WeTransfer</Text>
          </Group>
        </Link>
        <Group spacing={5} className={classes.links}>
          <Group>{items} </Group>
        </Group>
        <Burger
          opened={opened}
          onClick={() => toggleOpened.toggle()}
          className={classes.burger}
          size="sm"
        />
        <Transition transition="pop-top-right" duration={200} mounted={opened}>
          {(styles) => (
            <Paper className={classes.dropdown} withBorder style={styles}>
              <Stack spacing={0}> {items}</Stack>
            </Paper>
          )}
        </Transition>
      </Container>
    </MantineHeader>
  );
};

export default Header;